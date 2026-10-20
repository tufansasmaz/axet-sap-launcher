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

import { realpathSync } from "node:fs";
import path from "node:path";

export type ApprovalOutcome = "onaylandi" | "reddedildi" | "sure_doldu" | "kapandi";

/** Onayı isteyen taraf: bir Sohbet turu ya da bir Ajanlar bölmesi. */
export type ApprovalOwnerRef =
  | { tur: "sohbet"; id: string }
  | { tur: "bolme"; id: string; workspaceId: string; name: string };

/**
 * Onay isteğinin kime ait olduğu (bkz. `resolveOwnership`).
 * - tam: isteği yapan sürecin ata zinciri bu sahibin sürecinden geçiyor.
 * - klasor: süreç bilgisi yok, klasörü tutan TEK etkin aday.
 * - belirsiz: birden çok aday; otomatik devam YOK, kullanıcıya "hangi oturum?" notu.
 * - yok: bilinen hiçbir oturumun değil (ör. Studio dışında açılmış terminal).
 */
export type ApprovalOwnership =
  | { tur: "tam"; sahip: ApprovalOwnerRef }
  | { tur: "klasor"; sahip: ApprovalOwnerRef }
  | { tur: "belirsiz"; adaylar: ApprovalOwnerRef[] }
  | { tur: "yok" };

export type ApprovalEvent =
  /** Onay ucu "bekliyor" döndü (ilk istek ya da tekrarı). `sahiplik` yoksa eski davranış: klasörle eşleşir. */
  | { tur: "soruldu"; id: string; projectDir: string; sahiplik?: ApprovalOwnership }
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

/**
 * Karşılaştırma için klasör anahtarı. `realpathSync.native` büyük/küçük harfi,
 * ayırıcıyı, sondaki `\`'ı, 8.3 kısa adları (PROGRA~1) ve junction'ları diskteki
 * gerçek yola çeviriyor (ölçüldü). Klasör yoksa ya da okunamıyorsa düz
 * `path.resolve`; Windows'ta küçük harfe indirilir.
 */
export function dirKey(p: string): string {
  let r: string;
  try {
    r = realpathSync.native(path.resolve(p));
  } catch {
    r = path.resolve(p);
  }
  return process.platform === "win32" ? r.toLowerCase() : r;
}

export function sameProjectDir(a: string, b: string): boolean {
  return dirKey(a) === dirKey(b);
}

/**
 * Sohbet klasörü ile onay oturumunun klasörü aynı ya da biri ötekinin içinde
 * (sohbet SAP projesinin alt klasöründe açılmış olabilir). Kardeş ya da
 * ilgisiz klasörün onayı eşleşmez.
 */
export function relatedProjectDirs(a: string, b: string): boolean {
  const na = dirKey(a);
  const nb = dirKey(b);
  if (na === nb) return true;
  const inside = (child: string, parent: string) => {
    const rel = path.relative(parent, child);
    return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
  };
  return inside(na, nb) || inside(nb, na);
}

/** Onayın sahibi olabilecek bir oturum: süreç kimlikleri (kök süreç), klasörü, şu an çalışıyor mu. */
export interface ApprovalCandidate {
  ref: ApprovalOwnerRef;
  pids: number[];
  dir: string;
  active: boolean;
}

const registered = new Set<ApprovalCandidate>();
let candidateProvider: (() => ApprovalCandidate[]) | null = null;

/** Sohbet turu sürecini açınca kaydolur; dönen fonksiyon kaydı siler. */
export function registerApprovalCandidate(c: ApprovalCandidate): () => void {
  registered.add(c);
  return () => {
    registered.delete(c);
  };
}

/** Ajanlar bölmeleri (index.ts): o anki bölmeleri ve pty süreçlerini verir. */
export function setApprovalCandidateProvider(fn: (() => ApprovalCandidate[]) | null): void {
  candidateProvider = fn;
}

export function approvalCandidates(): ApprovalCandidate[] {
  let extra: ApprovalCandidate[] = [];
  try {
    extra = candidateProvider?.() ?? [];
  } catch {
    extra = [];
  }
  return [...registered, ...extra];
}

const refKey = (r: ApprovalOwnerRef) => `${r.tur}:${r.id}`;

/**
 * Önce süreç kimliği: `callerPids` isteği yapan sürecin ata zinciri (en yakından
 * uzağa; gated sunucu Windows'ta TCP tablosundan çıkarıyor). Zincirde kaydı olan
 * bir oturumun süreci varsa sahibi odur — klasörüne bakılmaz, aynı klasörde
 * çalışan sohbet ile bölme böylece karışmaz. Zincir var ama kimseye uymuyorsa
 * "yok" (Studio'nun bilmediği bir süreç). Zincir hiç yoksa (eski gated sunucu,
 * Windows dışı) klasör: ilgili klasördeki ETKİN tek aday; birden çoksa belirsiz.
 */
export function resolveOwnership(
  callerPids: number[] | null,
  projectDir: string,
  candidates: ApprovalCandidate[],
): ApprovalOwnership {
  if (callerPids && callerPids.length > 0) {
    for (const pid of callerPids) {
      const hits = candidates.filter((c) => c.pids.includes(pid));
      const uniq = [...new Map(hits.map((c) => [refKey(c.ref), c.ref])).values()];
      if (uniq.length === 1) return { tur: "tam", sahip: uniq[0] };
      if (uniq.length > 1) return { tur: "belirsiz", adaylar: uniq };
    }
    return { tur: "yok" };
  }
  const near = candidates.filter((c) => c.active && relatedProjectDirs(c.dir, projectDir));
  const uniq = [...new Map(near.map((c) => [refKey(c.ref), c.ref])).values()];
  if (uniq.length === 1) return { tur: "klasor", sahip: uniq[0] };
  if (uniq.length > 1) return { tur: "belirsiz", adaylar: uniq };
  return { tur: "yok" };
}

/** Bu sahiplik verilen oturuma mı ait: "evet", "belirsiz" (adaylar arasında) ya da "hayir". */
export function ownershipFor(own: ApprovalOwnership, ref: { tur: ApprovalOwnerRef["tur"]; id: string }): "evet" | "belirsiz" | "hayir" {
  const same = (r: ApprovalOwnerRef) => r.tur === ref.tur && r.id === ref.id;
  if (own.tur === "tam" || own.tur === "klasor") return same(own.sahip) ? "evet" : "hayir";
  if (own.tur === "belirsiz") return own.adaylar.some(same) ? "belirsiz" : "hayir";
  return "hayir";
}

export interface ApprovalSummary {
  /** Hâlâ karar bekleyenler. */
  pending: string[];
  /** Onaylanmış ama ajanın henüz kullanmadığı (tekrar göndermediği) onaylar. */
  approved: string[];
  denied: string[];
  expired: string[];
  closed: string[];
  /** Bu oturumun da aday olduğu ama sahibi belirlenemeyen istekler: otomatik devam yok. */
  ambiguous: string[];
}

/**
 * Bir sohbet turunda sorulan onayları izler. Yalnızca o klasörün olayları ve
 * yalnızca izleme sürerken "soruldu" olan kimlikler sayılır: başka bir
 * sohbetin ya da önceki bir turun onayı bu turu uyandırmaz.
 */
export class ApprovalTracker {
  private state = new Map<string, ApprovalOutcome | "bekliyor" | "kullanildi">();
  private ambiguous = new Set<string>();
  private off: (() => void) | null;
  private waiter: (() => void) | null = null;

  /**
   * `owner` verilirse sahiplik bilgisi taşıyan olaylarda yalnız bu oturumun
   * istekleri sayılır (aynı klasördeki bölmenin onayı bu turu uyandırmaz).
   * Sahipliksiz olay (eski gated sunucu) ve `owner`sız izleyici: klasör kuralı.
   */
  constructor(
    private readonly projectDir: string,
    private readonly owner?: { tur: ApprovalOwnerRef["tur"]; id: string },
  ) {
    this.off = onApprovalEvent((e) => this.handle(e));
  }

  private mine(e: Extract<ApprovalEvent, { tur: "soruldu" }>): "evet" | "belirsiz" | "hayir" {
    if (!e.sahiplik || !this.owner) return relatedProjectDirs(e.projectDir, this.projectDir) ? "evet" : "hayir";
    return ownershipFor(e.sahiplik, this.owner);
  }

  private handle(e: ApprovalEvent): void {
    if (e.tur === "soruldu") {
      const m = this.mine(e);
      if (m === "hayir") return;
      if (m === "belirsiz") {
        if (!this.state.has(e.id)) this.ambiguous.add(e.id);
        return;
      }
      this.ambiguous.delete(e.id);
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
    this.ambiguous.clear();
  }

  summary(): ApprovalSummary {
    const out: ApprovalSummary = { pending: [], approved: [], denied: [], expired: [], closed: [], ambiguous: [...this.ambiguous] };
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
