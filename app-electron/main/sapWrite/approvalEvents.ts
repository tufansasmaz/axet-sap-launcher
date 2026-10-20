// SAP yazma onayının olay yolu: onay ucu (server.ts) ne olduğunu buraya
// bildirir, sohbet turu (axetChat.ts) dinler. Ayrı dosya, çünkü sohbet testleri
// HTTP sunucusunu açmadan olayları kendileri yayabilsin.
//
// Neden var: adt_gated_server.py onay ucuna 10 sn zaman aşımıyla sorar ve
// "bekliyor" cevabını hemen ajana döndürür. Başsız `run` turunda model bunun
// üzerine turu bitiriyor; kullanıcı pencereden onaylasa da süreç çoktan
// kapanmış oluyor ve kimse ajanı uyandırmıyordu ("onayladım devam et" yazılana
// kadar). Sohbet turu artık turda sorulan onayları izliyor ve karar gelince
// aynı oturumu bir kez sürdürüyor (bkz. axetChat.ts `waitApprovals`).
//
// Olaylarda token, kaynak, fark YOK: yalnızca kayıt kimliği, proje klasörü, durum.

import path from "node:path";

export type ApprovalOutcome = "onaylandi" | "reddedildi" | "sure_doldu" | "kapandi";

export type ApprovalEvent =
  /** Onay ucu "bekliyor" döndü (ilk istek ya da tekrarı). */
  | { tur: "soruldu"; id: string; projectDir: string }
  /** Pencere onayı ajanın tekrar gönderdiği çağrıyla kullanıldı (izinli döndü). */
  | { tur: "kullanildi"; id: string; projectDir: string }
  /** Bekleyen istek karara bağlandı: pencere, süre ya da oturumun kapanması. */
  | { tur: "sonuclandi"; id: string; projectDir: string; durum: ApprovalOutcome };

type Listener = (e: ApprovalEvent) => void;
const listeners = new Set<Listener>();

export function onApprovalEvent(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function emitApprovalEvent(e: ApprovalEvent): void {
  for (const fn of [...listeners]) {
    try {
      fn(e);
    } catch {
      // Dinleyicinin hatası onay akışını bozmasın.
    }
  }
}

export function sameProjectDir(a: string, b: string): boolean {
  const na = path.resolve(a);
  const nb = path.resolve(b);
  return process.platform === "win32" ? na.toLowerCase() === nb.toLowerCase() : na === nb;
}

/**
 * Sohbet klasörü ile onay oturumunun klasörü aynı ya da biri ötekinin içinde
 * (sohbet SAP projesinin alt klasöründe açılmış olabilir). Kardeş ya da
 * ilgisiz klasörün onayı eşleşmez.
 */
export function relatedProjectDirs(a: string, b: string): boolean {
  if (sameProjectDir(a, b)) return true;
  const norm = (p: string) => {
    const r = path.resolve(p);
    return process.platform === "win32" ? r.toLowerCase() : r;
  };
  const na = norm(a);
  const nb = norm(b);
  const inside = (child: string, parent: string) => {
    const rel = path.relative(parent, child);
    return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
  };
  return inside(na, nb) || inside(nb, na);
}

export interface ApprovalSummary {
  /** Hâlâ karar bekleyenler. */
  pending: string[];
  /** Onaylanmış ama ajanın henüz kullanmadığı (tekrar göndermediği) onaylar. */
  approved: string[];
  denied: string[];
  expired: string[];
  closed: string[];
}

/**
 * Bir sohbet turunda sorulan onayları izler. Yalnızca o klasörün olayları ve
 * yalnızca izleme sürerken "soruldu" olan kimlikler sayılır: başka bir
 * sohbetin ya da önceki bir turun onayı bu turu uyandırmaz.
 */
export class ApprovalTracker {
  private state = new Map<string, ApprovalOutcome | "bekliyor" | "kullanildi">();
  private off: (() => void) | null;
  private waiter: (() => void) | null = null;

  constructor(private readonly projectDir: string) {
    this.off = onApprovalEvent((e) => this.handle(e));
  }

  private handle(e: ApprovalEvent): void {
    if (!relatedProjectDirs(e.projectDir, this.projectDir)) return;
    if (e.tur === "soruldu") {
      const cur = this.state.get(e.id);
      if (cur === undefined || cur === "bekliyor") this.state.set(e.id, "bekliyor");
    } else if (!this.state.has(e.id)) {
      return;
    } else if (e.tur === "kullanildi") {
      this.state.set(e.id, "kullanildi");
    } else if (this.state.get(e.id) === "bekliyor") {
      this.state.set(e.id, e.durum);
    }
    this.waiter?.();
  }

  /** Yeni alt tur: önceki turun izleri unutulur. */
  reset(): void {
    this.state.clear();
  }

  summary(): ApprovalSummary {
    const out: ApprovalSummary = { pending: [], approved: [], denied: [], expired: [], closed: [] };
    for (const [id, s] of this.state) {
      if (s === "bekliyor") out.pending.push(id);
      else if (s === "onaylandi") out.approved.push(id);
      else if (s === "reddedildi") out.denied.push(id);
      else if (s === "sure_doldu") out.expired.push(id);
      else if (s === "kapandi") out.closed.push(id);
    }
    return out;
  }

  /**
   * Bekleyen kalmayana kadar bekler. `stop` erken bitirir (iptal, kullanıcının
   * yeni mesajı), `timeoutMs` güvenlik sınırıdır (onay ucu zaten 10 dk'da
   * süreyi doldurur). Dönüş: "bitti" | "durduruldu" | "zaman_asimi".
   */
  wait(timeoutMs: number, setStop: (stop: (() => void) | null) => void): Promise<"bitti" | "durduruldu" | "zaman_asimi"> {
    return new Promise((resolve) => {
      let timer: NodeJS.Timeout | null = null;
      const finish = (r: "bitti" | "durduruldu" | "zaman_asimi") => {
        if (timer) clearTimeout(timer);
        this.waiter = null;
        setStop(null);
        resolve(r);
      };
      this.waiter = () => {
        if (this.summary().pending.length === 0) finish("bitti");
      };
      setStop(() => finish("durduruldu"));
      timer = setTimeout(() => finish("zaman_asimi"), timeoutMs);
      this.waiter();
    });
  }

  dispose(): void {
    this.off?.();
    this.off = null;
    this.waiter = null;
  }
}
