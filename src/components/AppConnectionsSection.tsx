import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ExternalLink,
  Files,
  Loader2,
  Mail,
  MessageSquare,
  Plug,
  Unplug,
  Workflow,
  XCircle
} from "lucide-react";
import { useLanguage, useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import type { ConnectorCheck, ConnectorMode, ConnectorProvider } from "../../app-electron/shared/types";

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
//
// "BAĞLAN" NE DEMEK (2026-09-04, kullanıcı isteğiyle yeniden tasarlandı).
// Kullanıcı: "bağlantıyı test et değil de, bağlan ve bağlantıyı kes şeklinde
// tek buton olsun". Burada açılıp kapanan bir SOKET YOK — bu uygulama hiçbir
// zaman bir bağlantı tutmuyor. O yüzden butonlar dürüst olsun diye anlamları
// şöyle sabitlendi:
//   Bağlan          = doğrula (axet-code'a sor) + BAŞARILIYSA aç
//                     (`connectorEnabled[provider] = true`)
//   Bağlantıyı Kes  = kapat (anında, hiçbir process başlatmadan)
// Yani "bağlı" = "hem çalışıyor hem de yapay zekânın kullanmasına izin var".
// Eskiden bunlar İKİ AYRI ŞEYDİ (test ekranı yeşil tik gösterirken sohbetin
// ayarı kapalı olabiliyordu) — kullanıcının "bağlandı diyor ama olmuyor"
// şikayetinin kaynağı tam olarak buydu. Tek doğruluk kaynağı artık
// `connectorEnabled`; onu da hem sohbet hem iki ajan aynı yerden okuyor
// (bkz. app-electron/main/connectorPolicy.ts).
const PROVIDERS: { id: ConnectorProvider; icon: typeof Mail; labelKey: TranslationKey }[] = [
  { id: "outlook", icon: Mail, labelKey: "appConnections.providerOutlook" },
  { id: "sharepoint", icon: Files, labelKey: "appConnections.providerSharepoint" }
];

// Bağlı bir uygulamanın araçlarının ULAŞTIĞI yerler. Kullanıcının isteği:
// "eğer uygulamalar bağlıysa her yerden erişilebilsin bunlara, yapay zeka
// ile konuştuğumuz". Üçü de artık aynı politikadan geçiyor; bu satır o sözü
// ekranda görünür kılıyor — yoksa kullanıcı bağlayıcıların yalnızca sohbete
// ait olduğunu sanmaya devam ederdi (eski hâlinde ekranda sadece "sohbet"
// yazıyordu).
const SURFACES: { icon: typeof Mail; labelKey: TranslationKey }[] = [
  { icon: MessageSquare, labelKey: "appConnections.surfaceChat" },
  { icon: Workflow, labelKey: "appConnections.surfaceFlows" },
  { icon: Bot, labelKey: "appConnections.surfaceSapGui" }
];

function randomRequestId(): string {
  return `connector-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Kartın içindeki uyarı + tek eylem. Sağlayıcıya ait, ekrana değil. */
function ProviderHint({ text, action, onAction }: { text: string; action: string; onAction: () => void }) {
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2">
      <div className="flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-200">
        <AlertTriangle size={12} className="mt-0.5 shrink-0" />
        {text}
      </div>
      <button
        onClick={onAction}
        className="mt-1.5 flex cursor-pointer items-center gap-1.5 rounded border border-amber-500/50 bg-amber-500/15 px-2 py-1 text-[11px] font-medium text-amber-100 hover:bg-amber-500/25"
      >
        <ExternalLink size={11} />
        {action}
      </button>
    </div>
  );
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
// interactive mode first." Bu, portala YÖNLENDİRİLMEYEN tek hata: çaresi
// portalde değil, bu makinedeki interaktif axet-code'da.
function isNoProjectSelectedError(text: string | undefined): boolean {
  if (!text) return false;
  return /no project selected/i.test(text) || /interactive mode/i.test(text);
}

// Canlı bulgu #2 (2026-08-30, aynı gün): proje seçimi çözüldükten sonra
// kullanıcı GERÇEKTEN farklı bir hata aldı: "Outlook integration is
// unauthorized (state 'ERROR' — authorization flow not completed)". Aynı
// provider için axet.nttdata.com/agentic platformunda BİRDEN FAZLA ayrı
// "Integration" kaydı olabiliyor (tekrarlanan re-authorization
// denemelerinden kalıntı) — bir kısmı çalışıyor, bir kısmı 'ERROR'
// durumunda kalmış kalıcı olarak. `PROVIDER_TEST_PROMPT` ajana TÜM mevcut
// connector tool'larını (bozuk olan(lar)ı atlayıp) sırayla denemesini
// söylüyor (bkz. agenticConnectors.ts) — genelde tek başına yeterli. Ama
// HEPSİ bozuksa portaldan temizlenmesi/yeniden yetkilendirilmesi gerekiyor.
function isIntegrationErrorState(text: string | undefined): boolean {
  if (!text) return false;
  return /unauthorized/i.test(text) || /state\s*'?ERROR'?/i.test(text) || /authorization flow/i.test(text);
}

const AGENTIC_PORTAL_URL = "https://axet.nttdata.com/agentic/";

function formatCheckedAt(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(locale, { dateStyle: "short", timeStyle: "short" });
}

interface Props {
  onOpenProjectTerminal: () => void;
}

// "Terminalde Giriş Yap" satırı KALDIRILDI (kullanıcı isteği, 2026-09-04):
// "terminalde giriş yap kısmı kaldırılsın, direkt agentic sitesine
// yönlendirsin bağlanamazsa". Bir başarısızlığın çaresi zaten neredeyse her
// zaman portaldeydi (entegrasyon hiç yok / 'ERROR' durumunda); `axet-code
// login` ise oturum düşmüşse gereken NADİR durumdu ve ekranın kalıcı bir
// satırını işgal ediyordu. Tek istisna proje seçimi — o portalde çözülemez,
// bu yüzden yalnızca o hata için terminal butonu duruyor.
export default function AppConnectionsSection({ onOpenProjectTerminal }: Props) {
  const t = useT();
  const language = useLanguage();

  const [busyProvider, setBusyProvider] = useState<ConnectorProvider | null>(null);
  const [results, setResults] = useState<Partial<Record<ConnectorProvider, ConnectorCheck>>>({});
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [mcpUrls, setMcpUrls] = useState<Partial<Record<ConnectorProvider, string>>>({});
  const [mode, setMode] = useState<ConnectorMode | null>(null);
  const requestIdRef = useRef<string | null>(null);

  useEffect(() => {
    Promise.all(PROVIDERS.map(({ id }) => window.api.getConnectorMcpUrl(id).then((url) => [id, url] as const))).then(
      (entries) => setMcpUrls(Object.fromEntries(entries))
    );
    // Önceki bağlanmaların sonucu config'te duruyor — modal her açıldığında
    // sıfırdan başlamak, kullanıcıyı her seferinde yeniden bağlanmaya
    // zorluyordu (her doğrulama ~30-60 sn).
    window.api.getConfig().then((cfg) => {
      setResults(cfg.connectorLastResults ?? {});
      setEnabled(cfg.connectorEnabled ?? {});
      setMode(cfg.connectorMode);
    });
  }, []);

  // Bağlan = doğrula + aç. Doğrulama main process'te zaten
  // `connectorEnabled`'ı sonuca göre yazıyor (adt tarafındaki tek yazma
  // noktası), burada yalnızca ekranı ona eşitliyoruz.
  const handleConnect = useCallback(async (provider: ConnectorProvider) => {
    const requestId = randomRequestId();
    requestIdRef.current = requestId;
    setBusyProvider(provider);
    try {
      const result = await window.api.testConnector(requestId, provider);
      if (result.cancelled) return;
      setResults((prev) => ({
        ...prev,
        [provider]: {
          connected: result.connected,
          detail: result.detail,
          error: result.error,
          missing: result.missing,
          checkedAt: new Date().toISOString()
        }
      }));
      setEnabled((prev) => ({ ...prev, [provider]: result.connected }));
    } finally {
      setBusyProvider(null);
      requestIdRef.current = null;
    }
  }, []);

  // Bağlantıyı Kes = sadece kapat. Hiçbir process başlatmıyor, anında.
  const handleDisconnect = useCallback(async (provider: ConnectorProvider) => {
    setEnabled((prev) => ({ ...prev, [provider]: false }));
    await window.api.setConnectorEnabled(provider, false);
  }, []);

  const handleCancel = useCallback(async () => {
    if (!requestIdRef.current) return;
    await window.api.cancelConnectorTest(requestIdRef.current);
  }, []);

  const handleModeChange = useCallback(async (next: ConnectorMode) => {
    setMode(next);
    await window.api.saveConfig({ connectorMode: next });
  }, []);

  // Uyarılar SAĞLAYICIYA BAĞLI. Eskiden hepsi `Object.values(results)`
  // üzerinden toplanıyordu: SharePoint'in hatası, yeşil Outlook kartının
  // yanında sahipsiz bir uyarı olarak beliriyordu.
  // Proje hatası dışındaki HER başarısızlık portale yönlendiriyor — eskiden
  // tanınmayan hatalar hiçbir yol göstermeden kırmızı bir satır olarak
  // kalıyordu.
  const diagnose = (r: ConnectorCheck | undefined) => {
    if (!r || r.connected) return null;
    const text = `${r.error ?? ""} ${r.detail ?? ""}`;
    if (isNoProjectSelectedError(text)) return "project" as const;
    if (r.missing) return "missing" as const;
    if (isIntegrationErrorState(text)) return "repair" as const;
    return "portal" as const;
  };

  const anyConnected = PROVIDERS.some(({ id }) => enabled[id]);

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-slate-400">{t("appConnections.intro")}</p>

      <div className="grid grid-cols-2 gap-3">
        {PROVIDERS.map(({ id, icon: Icon, labelKey }) => {
          const result = results[id];
          const busy = busyProvider === id;
          const isOn = Boolean(enabled[id]);
          const failed = Boolean(result && !result.connected);
          const mcpUrl = mcpUrls[id];
          const issue = isOn ? null : diagnose(result);
          return (
            <div
              key={id}
              className={`flex flex-col gap-3 rounded-xl border p-3.5 transition ${
                isOn
                  ? "border-accent-500/40 bg-accent-500/[0.06] shadow-sm shadow-accent-500/10"
                  : "border-base-700 bg-base-950/30"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
                    isOn
                      ? "border-accent-500/40 bg-accent-500/15 text-accent-400"
                      : "border-base-700 bg-base-800 text-slate-500"
                  }`}
                >
                  <Icon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-100">{t(labelKey)}</span>
                    {/* Durum rozeti TEK doğruluk kaynağını gösteriyor:
                        `connectorEnabled`. "Doğrulama geçti ama kapalı" diye
                        bir ara durum artık yok. */}
                    <span
                      className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        busy
                          ? "bg-accent-500/15 text-accent-400"
                          : isOn
                            ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]"
                            : failed
                              ? "bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]"
                              : "bg-base-800 text-slate-400"
                      }`}
                    >
                      {busy ? (
                        <Loader2 size={9} className="animate-spin" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      )}
                      {busy
                        ? t("appConnections.statusConnecting")
                        : isOn
                          ? t("appConnections.statusConnected")
                          : failed
                            ? t("appConnections.statusFailed")
                            : t("appConnections.statusDisconnected")}
                    </span>
                  </div>
                  {/* Bu adres, uygulamanın DEĞİL axet-code'un bağlandığı yer.
                      Çıplak hâliyle "bu uygulama oraya istek atıyor" izlenimi
                      veriyordu; artık kimin kullandığı yazıyor. */}
                  {mcpUrl && (
                    <div className="truncate text-[10px] text-slate-500" title={mcpUrl}>
                      {t("appConnections.servedBy")} · {mcpUrl}
                    </div>
                  )}
                </div>
              </div>

              {result && (
                <div className={`space-y-1 ${isOn || failed ? "" : "opacity-60"}`}>
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
                    <span>
                      {result.error ||
                        result.detail ||
                        (result.connected ? t("appConnections.connected") : t("appConnections.notConnected"))}
                    </span>
                  </div>
                  <div className="pl-[19px] text-[10px] text-slate-500">
                    {t("appConnections.checkedAt", { time: formatCheckedAt(result.checkedAt, language) })}
                  </div>
                </div>
              )}

              {/* Uyarı, ait olduğu kartın İÇİNDE — hangi sağlayıcıyı
                  kastettiği artık sorulmuyor. */}
              {issue === "project" && (
                <ProviderHint
                  text={t("appConnections.selectProjectHint")}
                  action={t("appConnections.openProjectTerminal")}
                  onAction={onOpenProjectTerminal}
                />
              )}
              {issue === "missing" && (
                <ProviderHint
                  text={t("appConnections.missingIntegrationHint")}
                  action={t("appConnections.openAgenticPortal")}
                  onAction={() => window.api.openExternalUrl(AGENTIC_PORTAL_URL)}
                />
              )}
              {issue === "repair" && (
                <ProviderHint
                  text={t("appConnections.integrationErrorHint")}
                  action={t("appConnections.openAgenticPortal")}
                  onAction={() => window.api.openExternalUrl(AGENTIC_PORTAL_URL)}
                />
              )}
              {issue === "portal" && (
                <ProviderHint
                  text={t("appConnections.connectFailedHint")}
                  action={t("appConnections.openAgenticPortal")}
                  onAction={() => window.api.openExternalUrl(AGENTIC_PORTAL_URL)}
                />
              )}

              {/* TEK buton (kullanıcı isteği): bağlıysa kesiyor, değilse
                  bağlıyor. "Test et" diye ayrı bir eylem yok — doğrulama
                  bağlanmanın kendisi. */}
              <div className="mt-auto flex items-center gap-1.5">
                {isOn ? (
                  <button
                    onClick={() => handleDisconnect(id)}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-base-600 bg-base-800 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-[var(--status-danger-border)] hover:bg-[var(--status-danger-bg)] hover:text-[var(--status-danger-text)]"
                  >
                    <Unplug size={13} />
                    {t("appConnections.disconnect")}
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(id)}
                    disabled={Boolean(busyProvider)}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-accent-500 px-3 py-2 text-xs font-medium text-accent-on transition hover:bg-accent-600 disabled:cursor-default disabled:opacity-50"
                  >
                    {busy ? <Loader2 size={13} className="animate-spin" /> : <Plug size={13} />}
                    {busy ? t("appConnections.statusConnecting") : t("appConnections.connect")}
                  </button>
                )}
                {busy && (
                  <button
                    onClick={handleCancel}
                    className="cursor-pointer rounded-lg border border-base-700 bg-base-800 px-2.5 py-2 text-xs text-slate-200 hover:bg-base-700"
                  >
                    {t("common.cancel")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bağlı bir uygulamanın nerelerde işe yaradığı. Hiçbiri bağlı değilken
          aynı kutu, "şu an hiçbiri yok" diyor — eski ekranda bu ayrım hiç
          yazmıyordu ve kullanıcı sohbette araçların neden olmadığını
          anlayamıyordu. */}
      <div
        className={`rounded-xl border p-3 ${
          anyConnected ? "border-base-700 bg-base-950/30" : "border-amber-500/40 bg-amber-500/10"
        }`}
      >
        <div className={`flex items-start gap-2 text-xs ${anyConnected ? "text-slate-300" : "text-amber-200"}`}>
          {anyConnected ? (
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-accent-400" />
          ) : (
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          )}
          <span className="leading-relaxed">
            {anyConnected ? t("appConnections.availableEverywhere") : t("appConnections.noneConnected")}
          </span>
        </div>
        {anyConnected && (
          <div className="mt-2 flex flex-wrap gap-1.5 pl-[22px]">
            {SURFACES.map(({ icon: SurfaceIcon, labelKey }) => (
              <span
                key={labelKey}
                className="flex items-center gap-1.5 rounded-full border border-base-700 bg-base-800/60 px-2.5 py-1 text-[11px] text-slate-300"
              >
                <SurfaceIcon size={11} className="text-accent-400" />
                {t(labelKey)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Kip ayarı ARTIK SADECE BURADA. Eskiden Ayarlar'daydı ve orada "off"
          da seçilebiliyordu: aynı şeyi (açık/kapalı) iki ayrı yerden ifade
          etmek, "bağlandı diyor ama olmuyor" şikayetinin ta kendisiydi.
          Açık/kapalı artık yukarıdaki Bağlan/Kes butonu; buradaki seçim
          yalnızca AÇIK olanların ne zaman yükleneceği — bir hız ayarı. */}
      {mode && anyConnected && (
        <div className="rounded-xl border border-base-700 bg-base-950/30 p-3">
          <div className="mb-2 text-xs font-medium text-slate-200">{t("appConnections.modeTitle")}</div>
          <div className="flex gap-1 rounded-lg border border-base-700 bg-base-900 p-1">
            {(["auto", "always"] as ConnectorMode[]).map((option) => (
              <button
                key={option}
                onClick={() => handleModeChange(option)}
                className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  mode === option
                    ? "bg-accent-500 text-accent-on"
                    : "text-slate-400 hover:bg-base-800 hover:text-slate-200"
                }`}
              >
                {t(`appConnections.mode.${option}` as TranslationKey)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            {t(`appConnections.modeHint.${mode}` as TranslationKey)}
          </p>
        </div>
      )}
    </div>
  );
}
