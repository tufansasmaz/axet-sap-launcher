import type { ManualSystem, SapLandscape, SapNode } from "../shared/types";

export function mergeManualSystems(landscape: SapLandscape, manualSystems: ManualSystem[]): SapLandscape {
  if (manualSystems.length === 0) return landscape;

  const manualNode: SapNode = {
    uuid: "manual-systems-root",
    name: "Manuel Eklenen Sistemler",
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
