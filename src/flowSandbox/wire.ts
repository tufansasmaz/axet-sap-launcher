// Flow sandbox ile ana süreç arasında taşınan değerlerin ortak dönüşümleri.
//
// İki taraf da kullanıyor: sandbox sayfası (runner.ts) ve ana süreç
// (app-electron/main/flowSandboxHost.ts). Tek bir yerde durması, iki yönün
// birbirinin tersi olarak kalmasını garanti ediyor. DOM'a da Node'a da
// dokunmuyor: Buffer gerçekleştirimi parametre olarak geliyor (sayfada
// `buffer` polyfill'i, ana süreçte Node'un Buffer'ı).

export type AnyRecord = Record<string, unknown>;

// Buffer'ın burada kullanılan yüzü. Tip bilerek gevşek: polyfill'in ve
// Node'un aşırı yüklenmiş `from` imzaları iki tsconfig'de (web ve node)
// aynı biçimde çözülmüyor.
export interface BufferLike {
  from(...args: never[]): Uint8Array;
  isBuffer(value: unknown): boolean;
}

export interface SerializedError {
  name: string;
  message: string;
  stack?: string;
}

const PREVIEW_MAX = 400;

// flowRuntime.js'teki `previewValue` ile birebir aynı: node.warn/error/log
// metinleri eskisi gibi görünsün.
export function previewValue(value: unknown, maxLen = PREVIEW_MAX): string {
  let cloned: unknown;
  try {
    cloned = JSON.parse(JSON.stringify(value));
  } catch {
    cloned = undefined;
  }
  let text: string | undefined;
  try {
    text = typeof cloned === "string" ? cloned : JSON.stringify(cloned);
  } catch {
    text = String(value);
  }
  if (text === undefined) text = String(value);
  return text && text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

// "__proto__" anahtarı düz atamayla hedefin prototipini değiştirirdi.
// Yapılandırılmış klon onu öz özellik olarak taşıyabiliyor (sandbox'tan ya da
// bir .xlsx sayfa adından gelebilir), öyle de kalmalı.
export function setOwn(target: AnyRecord, key: string, value: unknown): void {
  if (key === "__proto__") {
    Object.defineProperty(target, key, { value, enumerable: true, writable: true, configurable: true });
  } else {
    target[key] = value;
  }
}

// Süreç sınırını geçecek biçime indirme. IPC yapılandırılmış klonlama
// kullanıyor: fonksiyon ya da sembol içeren bir değer DataCloneError ile
// bütün mesajı düşürür. Eski motorun `cloneMessage`'ı fonksiyonları olduğu
// gibi taşıyordu, ama süreç sınırı onları taşıyamaz; burada bilerek
// atılıyorlar. Buffer'lar düz Uint8Array'e iniyor (ne Node Buffer'ı ne
// polyfill sınıfı karşıya sınıfıyla geçer); karşı taraf `fromWire` ile
// yeniden Buffer yapıyor.
export function toWire(value: unknown, seen: Map<object, unknown> = new Map()): unknown {
  if (typeof value === "function" || typeof value === "symbol") return undefined;
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);
  if (value instanceof Uint8Array) return new Uint8Array(value);
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return value;
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);
  if (Array.isArray(value)) {
    // `new Array(n)` + `in` kontrolü: seyrek diziler (ör. sheet_to_json'un
    // header:1 çıktısındaki boş hücreler) delikleriyle birlikte geçsin.
    const out: unknown[] = new Array(value.length);
    seen.set(value, out);
    for (let i = 0; i < value.length; i++) {
      if (i in value) out[i] = toWire(value[i], seen);
    }
    return out;
  }
  if (value instanceof Map) {
    const out = new Map();
    seen.set(value, out);
    value.forEach((v, k) => out.set(toWire(k, seen), toWire(v, seen)));
    return out;
  }
  if (value instanceof Set) {
    const out = new Set();
    seen.set(value, out);
    value.forEach((v) => out.add(toWire(v, seen)));
    return out;
  }
  const out: AnyRecord = {};
  seen.set(value, out);
  for (const key of Object.keys(value)) {
    const item = (value as AnyRecord)[key];
    if (typeof item === "function" || typeof item === "symbol") continue;
    setOwn(out, key, toWire(item, seen));
  }
  return out;
}

// Klondan gelen her Uint8Array yeniden Buffer oluyor: kullanıcı kodu
// `Buffer.isBuffer(msg.payload)` görmeye devam etsin, ana süreçteki diğer
// node'lar (http request, excel-to-json) da Buffer beklemeye devam etsin.
// Gelen nesne zaten taze bir klon, yerinde değiştirmek güvenli.
export function fromWire(value: unknown, BufferImpl: BufferLike, seen: Set<object> = new Set()): unknown {
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Uint8Array) {
    if (BufferImpl.isBuffer(value)) return value;
    const from = BufferImpl.from as unknown as (b: ArrayBufferLike, o: number, l: number) => Uint8Array;
    return from(value.buffer, value.byteOffset, value.byteLength);
  }
  if (seen.has(value)) return value;
  seen.add(value);
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      if (i in value) value[i] = fromWire(value[i], BufferImpl, seen);
    }
    return value;
  }
  if (value instanceof Map) {
    const entries = Array.from(value.entries());
    value.clear();
    for (const [k, v] of entries) value.set(fromWire(k, BufferImpl, seen), fromWire(v, BufferImpl, seen));
    return value;
  }
  if (value instanceof Set) {
    const items = Array.from(value.values());
    value.clear();
    for (const v of items) value.add(fromWire(v, BufferImpl, seen));
    return value;
  }
  if (value instanceof Date || value instanceof RegExp || ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return value;
  for (const key of Object.keys(value)) {
    setOwn(value as AnyRecord, key, fromWire((value as AnyRecord)[key], BufferImpl, seen));
  }
  return value;
}

export function serializeError(err: unknown): SerializedError {
  if (err && typeof err === "object") {
    const e = err as { name?: unknown; message?: unknown; stack?: unknown };
    return {
      name: typeof e.name === "string" ? e.name : "Error",
      message: typeof e.message === "string" ? e.message : String(err),
      stack: typeof e.stack === "string" ? e.stack : undefined
    };
  }
  return { name: "Error", message: String(err) };
}
