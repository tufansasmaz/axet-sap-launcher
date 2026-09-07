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

// SAP GUI Scripting koprusu (sap_gui_scripting_bridge.py) icin AYNI desen —
// gomulu, saf bir Python 3.12 + pywin32 kurulumu `resources/guiscript-runtime/
// python` altinda (bkz. package.json build.extraResources, PROJE-BILGI.md
// "SAP GUI Scripting Ekrani"). RFC runtime'dan farkli olarak lisansli bir
// SDK icermiyor (pywin32 acik kaynak/PyPI'dan) ama ayni "build makinesinde
// bir kere hazirla, gitignore'a ekle" deseni izleniyor — cunku Python
// dagitimin kendisi (~60MB) repoya commit edilecek bir sey degil.
export interface EmbeddedGuiScriptRuntime {
  pythonPath: string;
  bridgeScriptPath: string;
}

function guiScriptRuntimeRoot(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "guiscript-runtime")
    : path.join(app.getAppPath(), "resources", "guiscript-runtime");
}

function guiScriptBridgeRoot(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "sap-gui-scripting")
    : path.join(app.getAppPath(), "resources", "sap-gui-scripting");
}

export function getEmbeddedGuiScriptRuntime(): EmbeddedGuiScriptRuntime | null {
  const pythonPath = path.join(guiScriptRuntimeRoot(), "python", "python.exe");
  const bridgeScriptPath = path.join(guiScriptBridgeRoot(), "sap_gui_scripting_bridge.py");
  if (!existsSync(pythonPath) || !existsSync(bridgeScriptPath)) {
    return null;
  }
  return { pythonPath, bridgeScriptPath };
}
