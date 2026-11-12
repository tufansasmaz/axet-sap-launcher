import { spawn, type SpawnOptions } from "node:child_process";

// Ayrık (detached) süreç başlatma, `error` dinleyicisiyle (kararlilik-2 R8e).
//
// Ölçüm (kod): "SAP Logon'da Aç" SAPgui.exe'yi ve ön plan izleyicisini
// `spawn(...)` + `unref()` ile başlatıyordu, `error` dinleyicisi yoktu.
// `spawn` başlatma hatasını (yetki/politika engeli, EACCES, yol silinmiş)
// EŞZAMANSIZ bir `error` olayıyla bildirir; dinleyici yoksa bu olay
// `uncaughtException` olur: kullanıcı bir yığın izi penceresi görüyor, arayüz
// ise "açıldı" diyordu. try/catch bu olayı yakalamıyor.

export function spawnDetached(
  command: string,
  args: string[],
  options: SpawnOptions,
  onError: (err: Error) => void
): boolean {
  try {
    const child = spawn(command, args, { ...options, detached: true });
    child.on("error", (err) => {
      try {
        onError(err);
      } catch {
        /* bildirim hatası süreci düşürmesin */
      }
    });
    child.unref();
    return true;
  } catch (err) {
    onError(err as Error);
    return false;
  }
}
