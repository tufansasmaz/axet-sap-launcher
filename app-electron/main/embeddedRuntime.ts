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

// Sohbet kutusundaki mikrofonun konuşma tanıması (bkz. dictation.ts) — AYNI
// desen. `resources/whisper-runtime/{bin,models}` altında whisper.cpp'nin
// CPU yapısı ve Türkçe için seçilen model duruyor. Yine gitignore'da: ~200MB
// ikili + model dosyası repoya girmez.
//
// `bin/` içindeki DLL'ler ELENMEDEN durmalı: whisper-cli.exe çalışma anında
// makinenin CPU'suna göre `ggml-cpu-*.dll` varyantlarından birini seçiyor
// (bu makinede alderlake). "Kullanılmıyor gibi duran" varyantları silmek,
// uygulamayı sadece build makinesinin işlemcisinde çalışır hâle getirir.
// `ggml-blas.dll` + `libopenblas.dll` da şart — bunlar olmadan encoder düz
// CPU yoluna düşüyor ve small modeli 1.5 kat yavaşlıyor.
export interface EmbeddedWhisperRuntime {
  cliPath: string;
  modelPath: string;
}

function whisperRuntimeRoot(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "whisper-runtime")
    : path.join(app.getAppPath(), "resources", "whisper-runtime");
}

// Model dosyası ADIYLA aranıyor, listedeki İLK bulunan kazanıyor — modeli
// değiştirmek `models/` klasöründeki dosyayı değiştirmekten ibaret olsun diye.
//
// Sıra ÖLÇÜLEREK belirlendi (2026-09-03, bu makine, 12 çekirdek). Önce base
// seçilmişti çünkü düz CPU yapısında small 12 saniye sürüyordu; kullanıcı
// *"söylemlerim yanlış çıkıyor"* deyince ölçüm tekrarlandı ve small'ü
// makul süreye indiren iki şey bulundu:
//
//   1. **BLAS yapısı** (`whisper-blas-bin-x64.zip`, libopenblas ile):
//      small 12 sn → 8.2 sn.
//   2. Gerçek konuşmada çözücü yükü sentetik sesten çok daha az: aynı model
//      gerçek bir cümlede **4.3-4.7 sn**.
//
// base o cümleyi 1.5 sn'de yazıyor ama Türkçe doğruluğu kullanıcının
// şikâyet ettiği seviyede. 4-5 saniye, yanlış yazılmış bir cümleyi elle
// düzeltmekten hızlı — **small seçildi**.
//
// İş parçacığı sayısının etkisi YOK (t=4/7/12/16 hepsi aynı bantta): fark
// modelin kendisinde, çünkü whisper encoder'ı sesi her hâlükârda 30 saniyelik
// pencereye tamamlıyor — iki saniyelik bir cümle bile modelin tam bedelini
// ödüyor. Hız yine de sorun olursa base'e dönmek, `models/` içindeki dosyayı
// değiştirmekten ibaret.
const WHISPER_MODEL_CANDIDATES = ["ggml-small-q5_1.bin", "ggml-base-q5_1.bin"];

export function getEmbeddedWhisperRuntime(): EmbeddedWhisperRuntime | null {
  const root = whisperRuntimeRoot();
  const cliPath = path.join(root, "bin", "whisper-cli.exe");
  if (!existsSync(cliPath)) return null;
  const modelPath = WHISPER_MODEL_CANDIDATES.map((name) => path.join(root, "models", name)).find((p) =>
    existsSync(p)
  );
  if (!modelPath) return null;
  return { cliPath, modelPath };
}
