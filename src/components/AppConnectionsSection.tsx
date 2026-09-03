import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Files, Loader2, Mail, RefreshCw, TerminalSquare, XCircle } from "lucide-react";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import type { ConnectorProvider } from "../../app-electron/shared/types";

// Uygulama Bağlantıları — Outlook/SharePoint connector'ları. MİMARİ
// PİVOTU (2026-08-29): ÖNCEKİ tur burada kullanıcının kendi Azure AD "App
// Registration"ını (client id/tenant id) girip @azure/msal-node ile device-
// code OAuth yaptığı bir form vardı — kullanıcının kesin talebiyle
// TAMAMEN KALDIRILDI: "tenant id falan onları geçelim, biz axet.nttdata.com/
// agentic/ platformunu kullanıyoruz, orada outlook_tools/sharepoint_tools
// diye MCP'ler var, bu şekilde connector yapalım". Gerçek mimari
// (kullanıcının seçtiği yaklaşım): bu launcher axet.nttdata.com'a HİÇBİR
// ZAMAN doğrudan bir HTTP/MCP isteği atmıyor — `axet-code` CLI'nın zaten
// Okta SSO ile eriştiği Connector'ları (aXet Agentic platformunun MCP araç
// sunucuları) kullanıyor:
//   - https://axet.nttdata.com/api/agentic-mcp-tools/outlook_tools/mcp
//   - https://axet.nttdata.com/api/agentic-mcp-tools/sharepoint_tools/mcp
// "Bağlantıyı Test Et" butonu `window.api.testConnector` → main process
// → `axet-code run -q "<prompt>"` (bkz. agenticConnectors.ts) çağırıyor;
// ajan connector aracını çağırıp CONNECTOR_OK/CONNECTOR_FAIL formatında
// cevap veriyor. Kullanıcı henüz `axet-code login` ile giriş yapmadıysa
// (veya oturumu düşmüşse) test başarısız olur — bu durumda "Terminalde
// Giriş Yap" butonu, App.tsx'in ZATEN VAR OLAN gömülü terminal altyapısını
// (createTerminal/EmbeddedTerminal, axetChat.ts'in de kullandığı AYNI IPC)
// kullanarak `axet-code login` komutunu çalıştıran bir terminal açar.
const PROVIDERS: { id: ConnectorProvider; icon: typeof Mail; labelKey: TranslationKey }[] = [
  { id: "outlook", icon: Mail, labelKey: "appConnections.providerOutlook" },
  { id: "sharepoint", icon: Files, labelKey: "appConnections.providerSharepoint" }
];

function randomRequestId(): string {
  return `connector-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Canlı bulgu (2026-08-30): `axet-code run -q` (non-interactive) modunda
// outlook_tools/sharepoint_tools MCP araçları HİÇ yüklenmiyor — CLI
// binary'sindeki string'lerden doğrulandı (`SelectedProjectID`,
// `openProjectsDialog`, `ActionSelectProject`, `AXET_PROJECT_ID` env var) —
// bu, axet-code'un kendi dizin-bazlı "projects" komutundan TAMAMEN AYRI,
// AXET Agentic platformunun kendi "Project" kavramı: MCP connector'lar
// (Outlook/SharePoint gibi) hangi AXET Project'e bağlı olduklarını bilmek
// zorunda, ve bu seçim SADECE interaktif TUI'deki bir diyalogla yapılabiliyor
// — `run -q` modunda böyle bir diyalog gösterilecek yer yok, CLI'nın kendi
// hata mesajı da bunu doğruluyor: "No project selected, launch axet-code in
// interactive mode first." Bu yüzden bu durumu ÖZEL olarak tespit edip
// kullanıcıya "Terminalde Giriş Yap" (Okta SSO) yerine "AXET Projesi Seç"
// (gerçek interaktif `axet-code` TUI'sini açan) butonunu öneriyoruz.
function isNoProjectSelectedError(text: string | undefined): boolean {
  if (!text) return false;
  return /no project selected/i.test(text) || /interactive mode/i.test(text);
}

// Canlı bulgu #2 (2026-08-30, aynı gün): proje seçimi çözüldükten sonra
// kullanıcı GERÇEKTEN farklı bir hata aldı: "Outlook integration is
// unauthorized (state 'ERROR' — authorization flow not completed)". Bu
// makinedeki gerçek axet-code'a karşı canlı araştırma şunu gösterdi: aynı
// provider için axet.nttdata.com/agentic platformunda BİRDEN FAZLA ayrı
// "Integration" kaydı olabiliyor (muhtemelen tekrarlanan re-authorization
// denemelerinden kalıntı) — bir kısmı çalışıyor, bir kısmı 'ERROR'
// durumunda kalmış kalıcı olarak. `PROVIDER_TEST_PROMPT` artık ajana TÜM
// mevcut connector tool'larını (bozuk olan(lar)ı atlayıp) sırayla denemesini
// söylüyor (bkz. agenticConnectors.ts) — bu genelde tek başına yeterli
// (bu makinede canlı doğrulandı: 3 entegrasyondan 1'i sağlamdı, yeni
// prompt'la bulundu). Ama HEPSİ bozuksa (örn. hiç sağlam entegrasyon
// kalmamışsa) kullanıcının bunu axet.nttdata.com/agentic portalının kendi
// "Integrations"/"Connectors" ekranından TEMİZLEMESİ/yeniden yetkilendirmesi
// gerekiyor — bu launcher'ın erişemeyeceği bir yönetim ekranı.
function isIntegrationErrorState(text: string | undefined): boolean {
  if (!text) return false;
  return /unauthorized/i.test(text) || /state\s*'?ERROR'?/i.test(text) || /authorization flow/i.test(text);
}

const AGENTIC_PORTAL_URL = "https://axet.nttdata.com/agentic/";

interface Props {
  onOpenLoginTerminal: () => void;
  onOpenProjectTerminal: () => void;
}

export default function AppConnectionsSection({ onOpenLoginTerminal, onOpenProjectTerminal }: Props) {
  const t = useT();

  const [testingProvider, setTestingProvider] = useState<ConnectorProvider | null>(null);
  const [results, setResults] = useState<
    Record<string, { connected: boolean; detail: string; error?: string } | undefined>
  >({});
  const [mcpUrls, setMcpUrls] = useState<Partial<Record<ConnectorProvider, string>>>({});
  const requestIdRef = useRef<string | null>(null);

  useEffect(() => {
    Promise.all(PROVIDERS.map(({ id }) => window.api.getConnectorMcpUrl(id).then((url) => [id, url] as const))).then(
      (entries) => setMcpUrls(Object.fromEntries(entries))
    );
  }, []);

  const handleTest = useCallback(
    async (provider: ConnectorProvider) => {
      const requestId = randomRequestId();
      requestIdRef.current = requestId;
      setTestingProvider(provider);
      try {
        const result = await window.api.testConnector(requestId, provider);
        if (result.cancelled) {
          setResults((prev) => ({ ...prev, [provider]: undefined }));
          return;
        }
        setResults((prev) => ({
          ...prev,
          [provider]: { connected: result.connected, detail: result.detail, error: result.error }
        }));
      } finally {
        setTestingProvider(null);
        requestIdRef.current = null;
      }
    },
    []
  );

  const handleCancel = useCallback(async () => {
    if (!requestIdRef.current) return;
    await window.api.cancelConnectorTest(requestIdRef.current);
  }, []);

  const needsProjectSelection = Object.values(results).some(
    (r) => r && !r.connected && (isNoProjectSelectedError(r.error) || isNoProjectSelectedError(r.detail))
  );
  const needsIntegrationRepair = Object.values(results).some(
    (r) => r && !r.connected && (isIntegrationErrorState(r.error) || isIntegrationErrorState(r.detail))
  );

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-slate-400">{t("appConnections.intro")}</p>

      <div className="grid grid-cols-2 gap-3">
        {PROVIDERS.map(({ id, icon: Icon, labelKey }) => {
          const result = results[id];
          const busy = testingProvider === id;
          const mcpUrl = mcpUrls[id];
          return (
            <div key={id} className="flex flex-col gap-3 rounded-lg border border-base-700 bg-base-950/30 p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-base-800 text-accent-400">
                  <Icon size={16} />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-100">{t(labelKey)}</div>
                  {mcpUrl && (
                    <div className="truncate text-[10px] text-slate-500" title={mcpUrl}>
                      {mcpUrl}
                    </div>
                  )}
                </div>
              </div>

              {result && (
                <div
                  className={`flex items-start gap-1.5 text-xs ${
                    result.connected ? "text-[var(--status-success-text)]" : "text-[var(--status-danger-text)]"
                  }`}
                >
                  {result.connected ? (
                    <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                  ) : (
                    <XCircle size={13} className="mt-0.5 shrink-0" />
                  )}
                  <span>{result.error || result.detail || (result.connected ? t("appConnections.connected") : t("appConnections.notConnected"))}</span>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleTest(id)}
                  disabled={Boolean(testingProvider)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-md bg-accent-500 px-3 py-1.5 text-xs font-medium text-accent-on hover:bg-accent-600 disabled:cursor-default disabled:opacity-50"
                >
                  {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  {t("appConnections.testConnection")}
                </button>
                {busy && (
                  <button
                    onClick={handleCancel}
                    className="cursor-pointer rounded-md border border-base-700 bg-base-800 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-base-700"
                  >
                    {t("common.cancel")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {needsProjectSelection && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
          <div className="flex items-center gap-2 text-xs text-amber-200">
            <AlertTriangle size={14} className="shrink-0" />
            {t("appConnections.selectProjectHint")}
          </div>
          <button
            onClick={onOpenProjectTerminal}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-amber-500/50 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-500/25"
          >
            <ExternalLink size={12} />
            {t("appConnections.openProjectTerminal")}
          </button>
        </div>
      )}

      {needsIntegrationRepair && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
          <div className="flex items-center gap-2 text-xs text-amber-200">
            <AlertTriangle size={14} className="shrink-0" />
            {t("appConnections.integrationErrorHint")}
          </div>
          <button
            onClick={() => window.api.openExternalUrl(AGENTIC_PORTAL_URL)}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-amber-500/50 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-500/25"
          >
            <ExternalLink size={12} />
            {t("appConnections.openAgenticPortal")}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 rounded-lg border border-base-700 bg-base-950/30 p-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <TerminalSquare size={14} className="shrink-0 text-accent-400" />
          {t("appConnections.loginHint")}
        </div>
        <button
          onClick={onOpenLoginTerminal}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-base-700 bg-base-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-base-700"
        >
          <ExternalLink size={12} />
          {t("appConnections.openLoginTerminal")}
        </button>
      </div>
    </div>
  );
}
