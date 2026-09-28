// Flow sandbox sayfasının girişi (flow-sandbox.html).
//
// Bu sayfa Chromium sandbox'lı, Node'suz, ağı kesilmiş gizli bir pencerede
// açılıyor (app-electron/main/flowSandbox.ts). axet.flows function node kodu
// ve xlsx ayrıştırma/yazma burada çalışıyor; ana süreçte `node:vm` ile
// çalıştırmak `msg.constructor.constructor('return process')()` ile tam Node
// yetkisine kaçışa açıktı. Mantığın tamamı saf `runner.ts`'te; bu dosya
// yalnızca tarayıcıya özgü kabloyu bağlıyor.

// "buffer/" (sondaki eğik çizgiyle): paket adını Node'un yerleşik `buffer`
// modülünden ayırmanın bilinen yolu. Vite tarayıcı paketinde yerleşik modülü
// boş bir yer tutucuyla değiştirirdi; bu biçim npm paketini zorluyor.
import { Buffer } from "buffer/";
import * as XLSX from "xlsx";
import * as cptable from "xlsx/dist/cpexcel.full.mjs";
import XlsxPopulate from "xlsx-populate/browser/xlsx-populate.min.js";
import { createFlowRunner, serializeError, type FlowSandboxBridge, type RunReply } from "./runner";

interface PreloadBridge extends FlowSandboxBridge {
  done(reply: RunReply): void;
  ready(): void;
  onRun(handler: (request: unknown) => void): boolean;
}

type BridgeHolder = { take?: () => PreloadBridge | null };

// Köprü BİR KEZ alınıyor ve yalnızca bu kapanışta yaşıyor. Kullanıcı kodu
// sayfanın globallerine erişebildiği için `window.flowSandbox.take()`'i
// kendisi de çağırabilirdi; ilk çağrıyı biz yapınca ona `null` kalıyor.
const holder = (globalThis as unknown as { flowSandbox?: BridgeHolder }).flowSandbox;
const bridge = holder && typeof holder.take === "function" ? holder.take() : null;

// CSP ve oturum düzeyindeki istek filtresi WebRTC'yi görmüyor (UDP/STUN
// HTTP isteği değil). Sayfanın WebRTC'ye hiçbir ihtiyacı yok; kurucuları
// kaldırmak kullanıcı kodunun en kolay kaçış yolunu kapatıyor. Tam kapatma
// değil — ana süreç ayrıca WebRTC IP politikasını da kısıyor.
for (const name of ["RTCPeerConnection", "webkitRTCPeerConnection", "RTCDataChannel", "RTCSessionDescription", "RTCIceCandidate"]) {
  try {
    delete (globalThis as unknown as Record<string, unknown>)[name];
  } catch {
    // silinemiyorsa yapacak başka bir şey yok
  }
}

if (bridge) {
  XLSX.set_cptable(cptable);
  const runner = createFlowRunner({ bridge, BufferImpl: Buffer, XLSX, XlsxPopulate });
  bridge.onRun((request) => {
    void runner.handle(request).then((reply) => {
      try {
        bridge.done(reply);
      } catch (err) {
        // Yanıt klonlanamadıysa (ör. beklenmedik bir tip) ana süreç en
        // azından bu çalıştırmanın neden düştüğünü görsün; yoksa 10 sn
        // zaman aşımına kadar bekler.
        bridge.done({ runId: reply.runId, ok: false, error: serializeError(err) });
      }
    });
  });
  bridge.ready();
}
