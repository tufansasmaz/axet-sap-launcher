import type { AppLanguage, ManualSystem, SapLandscape, SapNode } from "../shared/types";

// Ağaçtaki TEK çevrilebilir düğüm adı bu — diğer her şey SAPUILandscape.xml'den
// geliyor ve çevrilmemeli. Metin main tarafında üretiliyor çünkü düğüm de
// burada üretiliyor; renderer'daki i18n sözlüğünü main'e import etmek React'ı
// da beraberinde getirirdi. launcher.ts'teki `connectMsg` ile aynı desen.
const MANUAL_ROOT_NAME: Record<AppLanguage, string> = {
  tr: "Manuel Eklenen Sistemler",
  en: "Manually Added Systems"
};

export function mergeManualSystems(
  landscape: SapLandscape,
  manualSystems: ManualSystem[],
  language: AppLanguage = "tr"
): SapLandscape {
  if (manualSystems.length === 0) return landscape;

  const manualNode: SapNode = {
    uuid: "manual-systems-root",
    name: MANUAL_ROOT_NAME[language] ?? MANUAL_ROOT_NAME.tr,
    nodes: [],
    items: manualSystems.map((sys) => ({
      uuid: sys.id,
      service: {
        uuid: sys.id,
        systemId: sys.systemId,
        name: sys.name,
        type: sys.type === "cloud" ? "BTP/CLOUD" : "SAPGUI",
        host: sys.host,
        port: sys.diagPort,
        raw: sys.host && sys.diagPort ? `${sys.host}:${sys.diagPort}` : "",
        routerId: null,
        routerString: null,
        username: null,
        manualAdtUrl: sys.adtUrl,
        isManual: true
      }
    }))
  };

  return {
    ...landscape,
    customers: [manualNode, ...landscape.customers]
  };
}
