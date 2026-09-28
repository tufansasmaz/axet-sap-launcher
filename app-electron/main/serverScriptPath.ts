import { existsSync } from "node:fs";
import path from "node:path";

// NTT Studio'nun başlattığı Python sunucularının (ADT sunucusu, RFC köprüsü)
// hangi betikten çalıştırılacağı.
//
// Paketle gelen toolkit kopyası HER ZAMAN önce: onay kapısı, kademe tabanı,
// bağlantı sabitlemesi ve TLS pin'i o betiklerin içinde. Proje klasörü ajanın
// yazabildiği yer; eskiden `.axet-code/skills/...` altındaki bir kopya
// toolkit'inkinin önüne geçiyordu ("kullanıcı elle koymuşsa onunki kazansın"),
// yani ajan korumasız bir `adt_gated_server.py` bırakıp launcher'a onu
// başlattırabilirdi (R2 O-1). Proje kopyası artık yalnızca toolkit hiç
// yoksa (geliştirme ortamında toolkit kurulmamışsa) kullanılıyor.
export function pickServerScript(
  projectDir: string,
  toolkitRoot: string | null | undefined,
  scriptRel: readonly string[],
  exists: (p: string) => boolean = existsSync
): string | null {
  const toolkitScript = toolkitRoot ? path.join(toolkitRoot, "sap-consultant", "skills", ...scriptRel) : null;
  if (toolkitScript && exists(toolkitScript)) return toolkitScript;
  if (toolkitRoot) return null;
  const projectScript = path.join(projectDir, ".axet-code", "skills", ...scriptRel);
  return exists(projectScript) ? projectScript : null;
}
