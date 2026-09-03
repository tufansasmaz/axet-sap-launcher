import { FlowProvider } from "../flows/FlowContext";
import AppShell from "./flows/AppShell";
import "../flows/flows.css";

// axet.flows — AI destekli, Node-RED uyumlu flow builder modülü. Kaynak:
// kullanıcının ayrı bir masaüstü uygulaması olarak geliştirdiği axetflow
// projesi (bkz. PROJE-BILGI.md "axet.flows Entegrasyonu" bölümü) — bu
// component sadece İNCE bir sarmalayıcı: gerçek uygulama mantığı/UI'ı
// (`src/flows/`, `src/components/flows/`) neredeyse birebir taşındı, sadece
// (a) kendi ayrı pencere çubuğu/ayarlar modalı kaldırılıp bu uygulamanın
// KENDİ ActivityBar/tema sistemine bağlandı, (b) model seçimi axet.code
// sohbet ekranıyla AYNI mantıkla — ayrı bir sayfa-üstü başlık çubuğunda
// DEĞİL, `ChatPanel.jsx`'in kendi bar'ında (bkz. AppShell.jsx) gösteriliyor
// (axet.code'daki "model seçici composer barında olsun" kararıyla aynı
// çizgide — bkz. PROJE-BILGI.md Adım 6), (c) `window.axet.*` IPC çağrıları
// bu uygulamanın kendi `window.api.flowsXxx` köprüsüne uyarlandı.
// Node/canvas/agent mantığının KENDİSİ değişmedi.
export default function AxetFlowsHome() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <FlowProvider>
        <AppShell />
      </FlowProvider>
    </div>
  );
}
