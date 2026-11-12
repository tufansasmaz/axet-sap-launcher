// Ana sürecin yakalanmamış hataları (kararlilik-2 R8e).
//
// Ölçüm: `uncaughtException` ve `unhandledRejection` yalnız `console.error`'a
// yazılıyordu. Paketlenmiş uygulamada konsol yok — kullanıcı günlüğünde
// (ntt-studio.log) bu hataların hiçbir izi kalmıyordu; "stabil çalışmıyor"
// şikâyetinin kanıtı tam da bu satırlar. Ayrıca her `uncaughtException` bir
// modal hata penceresi açıyordu: zamanlayıcıda tekrarlayan tek bir hata
// saniyede bir pencere demekti.
//
// Şimdi: her hata günlüğe (kısa, tek satır), modal pencere aynı ileti için
// dakikada en çok bir kez.

export interface ProcessErrorDeps {
  log(event: string, fields: Record<string, string>): void;
  showDialog(title: string, body: string): void;
  dialogTitle(): string;
  now(): number;
}

/** Aynı ileti için iki pencere arasındaki en kısa süre. */
export const DIALOG_THROTTLE_MS = 60_000;
const DETAIL_MAX = 300;

function describe(err: unknown): { message: string; stack: string } {
  if (err instanceof Error) return { message: err.message, stack: err.stack ?? err.message };
  const text = typeof err === "string" ? err : (() => {
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  })();
  return { message: text ?? String(err), stack: text ?? String(err) };
}

function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, DETAIL_MAX);
}

export function createProcessErrorReporter(deps: ProcessErrorDeps) {
  const lastShown = new Map<string, number>();
  return {
    uncaught(err: unknown): void {
      const { message, stack } = describe(err);
      try {
        deps.log("hata.yakalanmamis", { tur: "exception", ileti: oneLine(message) });
      } catch {
        /* günlük yazılamadı */
      }
      const key = oneLine(message);
      const at = deps.now();
      const prev = lastShown.get(key);
      if (prev !== undefined && at - prev < DIALOG_THROTTLE_MS) return;
      lastShown.set(key, at);
      try {
        deps.showDialog(deps.dialogTitle(), stack);
      } catch {
        /* pencere açılamadı */
      }
    },
    rejection(reason: unknown): void {
      const { message } = describe(reason);
      try {
        deps.log("hata.yakalanmamis", { tur: "rejection", ileti: oneLine(message) });
      } catch {
        /* günlük yazılamadı */
      }
    }
  };
}
