import { Fragment, type ReactNode } from "react";

// Kod bloklarını renklendiren, bağımsız/hafif bir sözcük ayırıcı — `markdownLite`
// ile aynı felsefe: TAM bir dil ayrıştırıcısı DEĞİL, sohbet cevaplarında geçen
// kod parçacıklarını okunur kılacak kadarı (yorum / metin / sayı / anahtar
// sözcük). Dört renk, dördü de temanın kendi değişkenlerinden geliyor; açık
// temada da okunur kalması bu yüzden ücretsiz.
//
// Neden harici bir kütüphane (highlight.js, shiki, prism) YOK:
//  - Bu makinede kurumsal npm, paketlerin install script'lerini engelliyor;
//    bir bağımlılık eklemek kurulumu belirsiz kılıyor.
//  - shiki/prism sohbet balonu için orantısız (yüzlerce KB gramer + tema).
//  - Buradaki dört sınıf, terminaldeki axet-code çıktısının yaptığı ayrımın
//    aynısı; daha ince bir ayrım (tip/fonksiyon/özellik) balon içinde
//    farkedilmiyor bile.
//
// BİLİNEN SINIR: bağlamdan bağımsız çalışıyor, yani bir dilin anahtar sözcüğü
// başka bir dilde değişken adı olarak geçerse yine renklenir. Yanlış boyanmış
// bir tanımlayıcı, boyanmamış bir bloktan daha az zarar veriyor.

interface Rules {
  comment: string;
  text: string;
  number: string;
  keywords: string[];
  /** ABAP ve SQL büyük/küçük harf duyarsız yazılır; C ailesi değil. */
  ignoreCase: boolean;
}

const NUMBER = "\\b(?:0[xX][0-9a-fA-F]+|\\d+(?:\\.\\d+)?)\\b";

const C_FAMILY: Rules = {
  comment: "/\\*[\\s\\S]*?\\*/|//[^\\n]*",
  text: '"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\'|`(?:\\\\.|[^`\\\\])*`',
  number: NUMBER,
  ignoreCase: false,
  keywords: [
    "abstract", "as", "async", "await", "break", "case", "catch", "class", "const", "continue",
    "default", "delete", "do", "else", "enum", "export", "extends", "false", "finally", "for",
    "from", "function", "get", "if", "implements", "import", "in", "instanceof", "interface",
    "let", "new", "null", "of", "private", "protected", "public", "readonly", "return", "satisfies",
    "set", "static", "super", "switch", "this", "throw", "true", "try", "type", "typeof",
    "undefined", "var", "void", "while", "yield",
  ],
};

const HASH_FAMILY: Rules = {
  comment: "#[^\\n]*",
  text: '"""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\'|"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\'',
  number: NUMBER,
  ignoreCase: false,
  keywords: [
    "and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del", "elif",
    "else", "except", "False", "finally", "for", "from", "global", "if", "import", "in", "is",
    "lambda", "None", "nonlocal", "not", "or", "pass", "raise", "return", "self", "True", "try",
    "while", "with", "yield",
    // kabuk betikleri de bu ailede (`#` yorum): en sık geçen birkaçı
    "do", "done", "echo", "esac", "export", "fi", "local", "then",
  ],
};

const SQL_FAMILY: Rules = {
  comment: "/\\*[\\s\\S]*?\\*/|--[^\\n]*",
  text: "'(?:''|[^'\\n])*'",
  number: NUMBER,
  ignoreCase: true,
  keywords: [
    "all", "alter", "and", "as", "asc", "between", "by", "case", "count", "create", "cross",
    "delete", "desc", "distinct", "drop", "else", "end", "exists", "from", "full", "group",
    "having", "in", "index", "inner", "insert", "into", "is", "join", "key", "left", "like",
    "limit", "max", "min", "not", "null", "offset", "on", "or", "order", "outer", "primary",
    "right", "select", "set", "sum", "table", "then", "union", "update", "values", "view",
    "when", "where", "with",
  ],
};

// ABAP: yorum ya satır başındaki `*` ya da herhangi bir yerdeki `"`. Bu yüzden
// `"` ABAP'ta metin sınırlayıcı DEĞİL — metinler `'...'` ve `` `...` ``.
const ABAP_FAMILY: Rules = {
  comment: "^\\*[^\\n]*|\"[^\\n]*",
  text: "'(?:''|[^'\\n])*'|`(?:``|[^`\\n])*`",
  number: NUMBER,
  ignoreCase: true,
  keywords: [
    "abap_false", "abap_true", "and", "append", "assigning", "at", "begin", "call", "case",
    "catch", "changing", "check", "class", "clear", "commit", "cond", "constants", "conv",
    "create", "data", "default", "definition", "delete", "do", "else", "elseif", "end",
    "endcase", "endclass", "enddo", "endform", "endif", "endloop", "endmethod", "endselect",
    "endtry", "endwhile", "exception", "exceptions", "exporting", "field-symbols", "for", "form",
    "free", "from", "function", "if", "implementation", "importing", "in", "index", "inheriting",
    "initial", "insert", "into", "is", "key", "like", "line", "loop", "message", "method",
    "methods", "modify", "move", "new", "not", "object", "of", "or", "order", "parameters",
    "perform", "private", "protected", "public", "raise", "raising", "read", "ref", "refresh",
    "returning", "rollback", "section", "select", "set", "sort", "structure", "sy-subrc", "table",
    "tables", "then", "to", "try", "type", "types", "up", "update", "using", "value", "when",
    "where", "while", "with", "work", "write",
  ],
};

const FAMILY_BY_LANG: Record<string, Rules> = {
  abap: ABAP_FAMILY,
  cds: ABAP_FAMILY,
  ddl: ABAP_FAMILY,
  sql: SQL_FAMILY,
  bash: HASH_FAMILY,
  dockerfile: HASH_FAMILY,
  ini: HASH_FAMILY,
  ps1: HASH_FAMILY,
  powershell: HASH_FAMILY,
  py: HASH_FAMILY,
  python: HASH_FAMILY,
  sh: HASH_FAMILY,
  shell: HASH_FAMILY,
  toml: HASH_FAMILY,
  yaml: HASH_FAMILY,
  yml: HASH_FAMILY,
  zsh: HASH_FAMILY,
};

// Derlenmiş düzenli ifadeler aile başına BİR KERE üretiliyor: akış sırasında
// aynı blok her lokmada yeniden çizilir, her çizimde regex derlemek israf.
const CACHE = new Map<Rules, RegExp>();

function patternFor(rules: Rules): RegExp {
  const cached = CACHE.get(rules);
  if (cached) return cached;
  // Sıra ÖNEMLİ: yorum → metin → sayı → anahtar sözcük. Ters sırada, bir
  // yorumun içindeki sözcükler ayrı ayrı boyanırdı.
  const kw = `\\b(?:${rules.keywords.join("|")})\\b`;
  const re = new RegExp(
    `(${rules.comment})|(${rules.text})|(${rules.number})|(${kw})`,
    rules.ignoreCase ? "gmi" : "gm"
  );
  CACHE.set(rules, re);
  return re;
}

const COMMENT_CLASS = "italic text-slate-500";
const TEXT_CLASS = "text-[var(--status-success-text)]";
const NUMBER_CLASS = "text-[var(--status-warning-text)]";
const KEYWORD_CLASS = "text-accent-400";

// Çok uzun bloklarda boyama, akış sırasındaki her lokmada tekrarlandığı için
// hissedilir bir gecikmeye dönüşüyor; bu sınırın üstünde düz metne düşülüyor.
const MAX_HIGHLIGHT_CHARS = 20_000;

export function highlightCode(code: string, lang: string): ReactNode {
  const key = lang.trim().toLowerCase();
  const rules = FAMILY_BY_LANG[key] ?? C_FAMILY;
  if (code.length > MAX_HIGHLIGHT_CHARS) return code;

  const re = patternFor(rules);
  re.lastIndex = 0;
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(code)) !== null) {
    // Boş eşleşme sonsuz döngü yapardı (`''` gibi bir metin sınırlayıcı
    // çiftinde olabiliyor) — bir karakter ilerleyip devam ediyoruz.
    if (match[0].length === 0) {
      re.lastIndex++;
      continue;
    }
    if (match.index > last) out.push(<Fragment key={`p${last}`}>{code.slice(last, match.index)}</Fragment>);
    const cls = match[1] ? COMMENT_CLASS : match[2] ? TEXT_CLASS : match[3] ? NUMBER_CLASS : KEYWORD_CLASS;
    out.push(
      <span key={`t${match.index}`} className={cls}>
        {match[0]}
      </span>
    );
    last = match.index + match[0].length;
  }
  if (last === 0) return code;
  if (last < code.length) out.push(<Fragment key={`p${last}`}>{code.slice(last)}</Fragment>);
  return out;
}
