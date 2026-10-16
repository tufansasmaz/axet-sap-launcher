// Başsız köprü ısıtma havuzu (İş 1, 2026-10-16): istem gelmeden açılmış
// `axet-code run` süreçleri.
//
// Ölçüm (axet-code 1.4.1, 5'er tur, ortanca): `run` istem gelmeden açılış
// işini yapıyor (güncelleme denetimi, yetenek eşitleme, bağlayıcı kurulumu);
// oturum ancak istem gelince açılıyor. Bağlayıcı kapalı ~3,3 → ~2,2 sn,
// açık ~7,2 → ~3,5 sn ilk cevap. Süreç stdin AÇIK bekletiliyor; tur
// başlayınca istem yazılıp kapatılıyor (axetHeadless.ts, `prewarmed`).
//
// Kurallar:
// - Sohbet başına en fazla 1, toplam en fazla 2 süreç (en eskisi öldürülür).
// - Anahtar BİREBİR eşleşmezse süreç kullanılmıyor: başka klasör/model/
//   oturum/bağlayıcı ile açılmış bir süreç yanlış ortamda çalışırdı.
// - Boşta 90 sn → öldürülüyor: çalışan axet-code exe'yi kilitli tutuyor ve
//   güncelleyici kullanımdaki exe'yi bozuyor (MSI 1310, 0 baytlık exe).
// - Sahiplenilmeden kapanan süreç havuzdan düşüyor; ölü süreç asla verilmez.
// - Sahiplenilene kadar gelen stdout/stderr ve kapanış olayları tamponlanıyor;
//   ilk `-v` satırları (güncelleme duyurusu dahil) böylece kaybolmuyor.

import { EventEmitter } from "node:events";
import { buildRunArgs, type ChildLike } from "./axetHeadless";

export interface PrewarmKey {
  chatId: string;
  cwd: string;
  /** "provider/model" ya da null (axet-code varsayılanı). */
  model: string | null;
  resumeId: string | null;
  useConnectors: boolean;
}

export type PrewarmOutcome = "acildi" | "kullanildi" | "uyusmadi" | "bosta-kapandi";

export interface PrewarmDeps {
  spawn(cmd: string, args: string[], opts: { cwd: string; env: NodeJS.ProcessEnv }): ChildLike;
  env(useConnectors: boolean): NodeJS.ProcessEnv;
  killTree(child: ChildLike): void;
  setTimer(fn: () => void, ms: number): unknown;
  clearTimer(handle: unknown): void;
  log?(chatId: string, outcome: PrewarmOutcome): void;
  idleMs?: number;
  maxTotal?: number;
}

export interface PrewarmPool {
  prewarm(key: PrewarmKey): void;
  take(key: PrewarmKey): ChildLike | null;
  drop(chatId: string): void;
  dropAll(): void;
  size(): number;
}

export const PREWARM_IDLE_MS = 90_000;
export const PREWARM_MAX_TOTAL = 2;

function sameKey(a: PrewarmKey, b: PrewarmKey): boolean {
  return (
    a.chatId === b.chatId &&
    a.cwd === b.cwd &&
    a.model === b.model &&
    a.resumeId === b.resumeId &&
    a.useConnectors === b.useConnectors
  );
}

/** Havuzdan verilen süreç: olaylar sahiplenene kadar tamponda bekliyor. */
class WarmChild extends EventEmitter {
  pid?: number;
  stdin: ChildLike["stdin"];
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  constructor(
    real: ChildLike,
    private readonly killReal: () => void
  ) {
    super();
    this.pid = real.pid;
    this.stdin = real.stdin;
    // Dinleyicisiz 'error' olayı EventEmitter'da istisna atar; ana süreç çökmesin.
    this.on("error", () => {});
  }
  /** killTree'nin pid'siz yedeği (`child.kill()`). */
  kill(): void {
    this.killReal();
  }
}

interface Entry {
  key: PrewarmKey;
  real: ChildLike;
  wrapper: WarmChild;
  owned: boolean;
  flushed: boolean;
  queue: (() => void)[];
  timer: unknown;
}

export function createPrewarmPool(deps: PrewarmDeps): PrewarmPool {
  const idleMs = deps.idleMs ?? PREWARM_IDLE_MS;
  const maxTotal = deps.maxTotal ?? PREWARM_MAX_TOTAL;
  const entries = new Map<string, Entry>(); // chatId → süreç; sıra = açılış sırası

  const log = (chatId: string, outcome: PrewarmOutcome) => {
    try {
      deps.log?.(chatId, outcome);
    } catch {
      // günlük yazılamadı: ısıtma bundan etkilenmemeli
    }
  };
  const killQuiet = (child: ChildLike) => {
    try {
      deps.killTree(child);
    } catch {
      // zaten kapanmış olabilir
    }
  };
  const remove = (entry: Entry) => {
    if (entries.get(entry.key.chatId) === entry) entries.delete(entry.key.chatId);
    try {
      deps.clearTimer(entry.timer);
    } catch {
      // zamanlayıcı zaten bitmiş
    }
  };
  const discard = (entry: Entry) => {
    remove(entry);
    killQuiet(entry.real);
  };

  const flush = (entry: Entry) => {
    entry.flushed = true;
    const queue = entry.queue;
    entry.queue = [];
    for (const fn of queue) {
      try {
        fn();
      } catch {
        // dinleyiciden kaçan istisna zamanlayıcıdan ana sürece taşmasın
      }
    }
  };

  function prewarm(key: PrewarmKey): void {
    const existing = entries.get(key.chatId);
    if (existing && sameKey(existing.key, key)) return;
    if (existing) discard(existing);
    while (entries.size >= maxTotal) {
      const oldest = entries.values().next().value as Entry;
      discard(oldest);
    }

    let real: ChildLike;
    try {
      const args = buildRunArgs({ cwd: key.cwd, model: null, resumeId: key.resumeId });
      // buildRunArgs `-m`'yi en sona koyuyor; anahtar zaten "provider/model".
      if (key.model) args.push("-m", key.model);
      real = deps.spawn("axet-code", args, { cwd: key.cwd, env: deps.env(key.useConnectors) });
    } catch {
      return; // açılamadı: tur bugünkü gibi kendi sürecini açar
    }

    const entry: Entry = {
      key: { ...key },
      real,
      wrapper: new WarmChild(real, () => {
        try {
          (real as unknown as { kill(): void }).kill();
        } catch {
          // zaten kapanmış
        }
      }),
      owned: false,
      flushed: false,
      queue: [],
      timer: null
    };
    const deliver = (fn: () => void) => {
      if (entry.owned && entry.flushed) {
        try {
          fn();
        } catch {
          // dinleyici istisnası akış olayından ana sürece taşmasın
        }
      } else entry.queue.push(fn);
    };
    const ended = (fn: () => void) => {
      if (!entry.owned) {
        // Sahiplenilmeden öldü: havuzdan düşüyor, kimseye verilmeyecek.
        remove(entry);
        return;
      }
      deliver(fn);
    };

    real.stdin?.on("error", () => {});
    real.stdout?.on("data", (chunk: Buffer) => deliver(() => entry.wrapper.stdout.emit("data", chunk)));
    real.stderr?.on("data", (chunk: Buffer) => deliver(() => entry.wrapper.stderr.emit("data", chunk)));
    real.on("close", (code) => ended(() => entry.wrapper.emit("close", code)));
    real.on("error", (err) => ended(() => entry.wrapper.emit("error", err)));

    try {
      entry.timer = deps.setTimer(() => {
        if (entries.get(key.chatId) !== entry) return;
        discard(entry);
        log(key.chatId, "bosta-kapandi");
      }, idleMs);
    } catch {
      entry.timer = null;
    }
    entries.set(key.chatId, entry);
    log(key.chatId, "acildi");
  }

  function take(key: PrewarmKey): ChildLike | null {
    const entry = entries.get(key.chatId);
    if (!entry) return null;
    if (!sameKey(entry.key, key)) {
      discard(entry);
      log(key.chatId, "uyusmadi");
      return null;
    }
    remove(entry);
    entry.owned = true;
    // startHeadlessTurn dinleyicileri senkron bağlıyor; tampon bir sonraki
    // döngüde boşaltılıyor ki hiçbir olay dinleyicisiz yayılmasın.
    setImmediate(() => flush(entry));
    log(key.chatId, "kullanildi");
    return entry.wrapper as unknown as ChildLike;
  }

  function drop(chatId: string): void {
    const entry = entries.get(chatId);
    if (entry) discard(entry);
  }

  function dropAll(): void {
    for (const entry of Array.from(entries.values())) discard(entry);
  }

  return { prewarm, take, drop, dropAll, size: () => entries.size };
}
