// Destek paketine giren her metin buradan geçiyor (spec 2026-10-16 §5).
// Önce bilinen değerler birebir (ADT anahtarı, onay anahtarları, kayıtlı
// şifreler), sonra kalıplar. Değerler hiçbir yere yazılmıyor; yalnız kaç kez
// maskelendiği sayılıyor ve `bilgi.json`'a o sayı giriyor.

export const MASK = "«gizli»";

export interface RedactResult {
  text: string;
  counts: Record<string, number>;
}

const MIN_SECRET = 8;

// Ad ve ayıraç kalıyor, değer gidiyor. `\b` Türkçe harfte (ş) çalışmadığı için
// solda ASCII kelime karakteri olmaması lookbehind ile isteniyor.
const KEY_VALUE =
  /(?<![A-Za-z0-9_])(password|passwd|pwd|parola|şifre|token|secret|api[_-]?key|ADT_SAP_PASSWORD|ABAP_HTTP_TOKEN|ADT_APPROVAL_TOKEN)(["']?\s*[=:]\s*["']?)([^\s"',;}]+)/giu;

const PATTERNS: { name: string; re: RegExp; replace: (match: string, ...groups: string[]) => string }[] = [
  {
    name: "authorization",
    re: /(Authorization["']?\s*[:=]\s*["']?)(?:Basic|Bearer)?\s*[A-Za-z0-9._~+/=-]{6,}/gi,
    replace: (_m, head) => `${head}${MASK}`
  },
  { name: "bearer", re: /Bearer\s+[A-Za-z0-9._~+/=-]{8,}/g, replace: () => `Bearer ${MASK}` },
  { name: "github", re: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/g, replace: () => MASK },
  { name: "jwt", re: /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g, replace: () => MASK }
];

function bump(counts: Record<string, number>, name: string): void {
  counts[name] = (counts[name] ?? 0) + 1;
}

export function redact(text: string, secrets: readonly string[]): RedactResult {
  const counts: Record<string, number> = {};
  let out = text;
  // Uzun değer önce: biri ötekinin parçasıysa kısası uzunu bölmesin.
  for (const secret of [...new Set(secrets)].filter((s) => s.length >= MIN_SECRET).sort((a, b) => b.length - a.length)) {
    const parts = out.split(secret);
    if (parts.length > 1) {
      counts.known = (counts.known ?? 0) + parts.length - 1;
      out = parts.join(MASK);
    }
  }
  for (const p of PATTERNS) {
    out = out.replace(p.re, (...args: string[]) => {
      const match = args[0];
      if (match.includes(MASK)) return match;
      bump(counts, p.name);
      return p.replace(match, ...args.slice(1));
    });
  }
  out = out.replace(KEY_VALUE, (match: string, name: string, sep: string, value: string) => {
    if (value === MASK || value.startsWith(MASK)) return match;
    bump(counts, "keyValue");
    return `${name}${sep}${MASK}`;
  });
  return { text: out, counts };
}

export function addCounts(into: Record<string, number>, from: Record<string, number>): void {
  for (const [k, v] of Object.entries(from)) into[k] = (into[k] ?? 0) + v;
}
