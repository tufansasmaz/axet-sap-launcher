import { app } from "electron";
import { existsSync } from "node:fs";
import path from "node:path";

// SAP NW RFC SDK (lisanslı SAP indirmesi) + pyrfc + saf bir Python 3.12
// runtime'ı `resources/rfc-runtime/{python,sdk}` altına gömülü olarak
// paketleniyor (bkz. package.json build.extraResources) — kullanıcının
// ayrıca Python/SDK/pyrfc kurması GEREKMEZ, RFC bridge otomatik başlatma
// bu runtime'ı kullanır. `resources/rfc-runtime` build makinesinde bir kere
// elle hazırlanır (bkz. PROJE-BILGI.md "Gömülü RFC Runtime"), repoya
// commit edilmez (.gitignore) — SAP'nin SDK'sını yeniden dağıtma riskini
// git geçmişine/uzak repoya taşımamak için.

export interface EmbeddedRfcRuntime {
  pythonPath: string;
  sapnwrfcHome: string;
}

function rfcRuntimeRoot(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "rfc-runtime")
    : path.join(app.getAppPath(), "resources", "rfc-runtime");
}

export function getEmbeddedRfcRuntime(): EmbeddedRfcRuntime | null {
  const root = rfcRuntimeRoot();
  const pythonPath = path.join(root, "python", "python.exe");
  const sapnwrfcHome = path.join(root, "sdk");
  if (!existsSync(pythonPath) || !existsSync(path.join(sapnwrfcHome, "lib", "sapnwrfc.dll"))) {
    return null;
  }
  return { pythonPath, sapnwrfcHome };
}
