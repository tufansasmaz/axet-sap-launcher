import type { ActiveSapContext } from "../shared/types";

// "Bağlantıyı kes" (başlık çubuğundaki rozetin çarpısı) — kararlilik-2 R8a.
//
// Eskiden yalnız ROZET temizleniyordu: bağlamın SAP tarafı `null` oluyordu ama
// o sistemin RFC köprüsü, 8787'deki ADT sunucusu ve DEV onay oturumu ayakta
// kalıyordu. O klasördeki sohbet/ajan aynı sisteme çağrı yapmaya devam
// ediyordu; kullanıcının deyişiyle "bağlantıyı kessem de fark etmiyor".
// Artık kesme, bağlantının açtığı her şeyi o proje klasörü için kapatıyor.
//
// Bağımlılıklar dışarıdan: bu modül süreç yöneticilerini bilmiyor, test
// edilebilir kalıyor (bkz. tests/sapDisconnect.test.ts).

export interface SapDisconnectDeps {
  getSap(): ActiveSapContext | null;
  clearSap(): void;
  stopRfcBridge(projectDir: string): void;
  stopAdtServer(projectDir: string): void;
  closeWriteSession(projectDir: string): void;
  log?(event: string, fields: Record<string, string>): void;
}

export interface SapDisconnectResult {
  /** Kesilen bağlantının proje klasörü; bağlı sistem yoksa null. */
  projectDir: string | null;
}

export function disconnectActiveSap(deps: SapDisconnectDeps): SapDisconnectResult {
  const sap = deps.getSap();
  if (!sap) return { projectDir: null };
  const dir = sap.projectDir;
  // Önce bağlam: süreçlerden biri durdurulamasa bile ekran ve ajanın
  // istemindeki bağlam bloğu "bağlı" demeye devam etmemeli.
  deps.clearSap();
  const steps: Array<[string, (d: string) => void]> = [
    ["onay", deps.closeWriteSession],
    ["adt", deps.stopAdtServer],
    ["kopru", deps.stopRfcBridge]
  ];
  const failed: string[] = [];
  for (const [name, fn] of steps) {
    try {
      fn(dir);
    } catch {
      failed.push(name);
    }
  }
  deps.log?.("sap.baglanti-kesildi", { hata: failed.length ? failed.join(",") : "-" });
  return { projectDir: dir };
}
