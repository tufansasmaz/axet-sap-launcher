import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, RefreshCw, Radio, Wand2 } from "lucide-react";
import { useT } from "../i18n";

const STORAGE_KEY = "axetFlowsLiveUrl";
// Node-RED'in Monaco tabanlı editörü (palet, tema, tüm JS/CSS bundle'ları)
// ilk açılışta birkaç saniye sürebiliyor - bu yüzden "asılı kaldı" kararını
// ÇOK erken vermiyoruz (önceki sürümde 6s idi, yanlış pozitiflere yol
// açıyordu).
const LOAD_TIMEOUT_MS = 15000;
const RECOVERY_INTERVAL_MS = 4000;
const PROBE_TIMEOUT_MS = 2000;

// KÖK SEBEP (kullanıcı canlı test ile doğruladı): host adı "127.0.0.1"
// DEĞİL "localhost" olmalı — aksi halde Node-RED editörünün admin API
// istekleri origin uyuşmazlığı yüzünden hiç tamamlanmıyor ve ekran
// "Bağlanılıyor..." adımında sonsuza kadar asılı kalıyor. Kullanıcının
// elle yazdığı VEYA localStorage'da önceden cache'lenmiş "127.0.0.1"
// adresleri de burada otomatik "localhost"a çevriliyor.
function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  return withScheme.replace(/127\.0\.0\.1/g, "localhost");
}

function settingsUrl(base: string): string {
  return base.endsWith("/") ? `${base}settings` : `${base}/settings`;
}

// axet.flows'un kendi CORS ayarı gerçekten "Access-Control-Allow-Origin: *"
// gönderiyor (canlı doğrulandı) — bu yüzden renderer'dan doğrudan fetch()
// ile /settings uç noktasına GET atarak "gerçekten şu an erişilebilir mi"
// diye ucuz/hızlı sorabiliyoruz.
async function probeReachable(baseUrl: string, timeoutMs = PROBE_TIMEOUT_MS): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(settingsUrl(baseUrl), { signal: controller.signal, cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// axet.flows (Live) — kullanıcının kendi makinesinde ayrıca çalıştırdığı
// GERÇEK aXet.flows Designer host'unu (Node-RED v4 tabanlı, NTT DATA
// markalı ticari ürün — bkz. PROJE-BILGI.md) doğrudan gömüp gösteren bir
// aktivite. Basit bir <iframe> kullanır — o host X-Frame-Options/CSP
// frame-ancestors header'ı GÖNDERMİYOR (canlı doğrulandı), bu yüzden gömme
// engellenmiyor.
//
// KALICILIK: bu bileşen App.tsx tarafında HER ZAMAN mount edilmiş kalır
// (aktivite değişince sadece CSS ile gizlenir/gösterilir, hiç unmount
// edilmez) — bu yüzden sekmeler arası geçişte sayfa sıfırdan yüklenmiyor.
//
// "SONSUZA KADAR BAĞLANIYOR" SORUNU — İKİ AYRI DENEME, İKİ AYRI HATA:
//  1) Basit iframe'in `onLoad` GEÇ (ama sonunda) tetiklendiği durumlar
//     için 15s'lik bir zaman aşımı watchdog'u var — süre dolarsa "hata"
//     durumuna zorla geçilir.
//  2) BİR ÖNCEKİ sürümde eklenen "kurtarma döngüsü" YANLIŞLIKLA `loading`
//     durumunu da "sağlıksız" sayıp host erişilebilir olduğunda HENÜZ
//     YÜKLENMEKTE OLAN iframe'i her 4 saniyede bir zorla yeniden
//     başlatıyordu (reloadKey artırarak) — Monaco editörü tam açılmadan
//     sürekli sıfırlanınca sayfa HİÇBİR ZAMAN `onLoad` tetikleyemiyordu
//     (sonsuz "yeniden başlat" döngüsü, "sonsuza kadar bağlanıyor" görünümü
//     buydu). DÜZELTME: kurtarma döngüsü SADECE gerçekten `loadError` true
//     olduğunda veya hiç `activeUrl` yokken çalışır — normal, devam eden
//     bir yüklemeye HİÇ dokunmaz.
export default function AxetFlowsLiveHome() {
  const t = useT();
  const [inputUrl, setInputUrl] = useState(() => {
    try {
      return normalizeUrl(localStorage.getItem(STORAGE_KEY) || "");
    } catch {
      return "";
    }
  });
  const [activeUrl, setActiveUrl] = useState<string | null>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      return cached ? normalizeUrl(cached) : null;
    } catch {
      return null;
    }
  });
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(!!activeUrl);
  const [loadError, setLoadError] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const activeUrlRef = useRef<string | null>(activeUrl);
  activeUrlRef.current = activeUrl;
  const checkingRef = useRef(false);

  const connectTo = useCallback((url: string) => {
    const normalized = normalizeUrl(url);
    if (!normalized) return;
    setInputUrl(normalized);
    setLoading(true);
    setLoadError(false);
    setActiveUrl(normalized);
    setReloadKey((k) => k + 1);
    try {
      localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      // localStorage yoksa (gizli mod vb.) sessizce yok say - bu ayarın
      // kaybolması sadece bir sonraki oturumda tekrar sıfırdan keşif
      // gerektirmesi anlamına gelir, kritik değil.
    }
  }, []);

  const autoDetect = useCallback(
    async (silent = false) => {
      setDetecting(true);
      if (!silent) setDetectError(null);
      try {
        const result = await window.api.discoverAxetFlowsLiveUrl();
        if (result.ok && result.url) {
          const normalized = normalizeUrl(result.url);
          if (normalized !== activeUrlRef.current) {
            connectTo(normalized);
          }
        } else if (!silent) {
          setDetectError(result.error ?? t("axetFlowsLive.detectFailed"));
        }
      } catch {
        if (!silent) setDetectError(t("axetFlowsLive.detectFailed"));
      } finally {
        setDetecting(false);
      }
    },
    [connectTo, t]
  );

  // Mount olduğunda: cache'deki URL varsa zaten yukarıda anında set edildi
  // (instant connect) — burada arka planda SESSİZCE keşfi tetikliyoruz.
  useEffect(() => {
    autoDetect(!!activeUrlRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (1) Yükleme zaman aşımı watchdog'u — bkz. dosya başındaki not.
  // `reloadKey` değiştiğinde (yeni bir yükleme denemesi) SIFIRLANIR.
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      setLoading(false);
      setLoadError(true);
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loading, reloadKey]);

  // (2) Kurtarma döngüsü — SADECE gerçek bir hata VARKEN veya hiç URL
  // yokken çalışır. Devam eden normal bir yüklemeye (loading===true,
  // loadError===false) hiç dokunmaz — bkz. dosya başındaki kök sebep notu.
  useEffect(() => {
    const needsRecovery = loadError || !activeUrl;
    if (!needsRecovery) return;
    const interval = setInterval(async () => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      try {
        const current = activeUrlRef.current;
        if (current) {
          const reachable = await probeReachable(current);
          if (reachable) {
            setLoading(true);
            setLoadError(false);
            setReloadKey((k) => k + 1);
            return;
          }
        }
        // Mevcut URL erişilemez (veya hiç URL yok) - tam keşfi sessizce
        // tekrar dene (port değişmiş olabilir).
        await autoDetect(true);
      } finally {
        checkingRef.current = false;
      }
    }, RECOVERY_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activeUrl, loadError, autoDetect]);

  const connect = useCallback(() => connectTo(inputUrl), [connectTo, inputUrl]);

  const reload = useCallback(() => {
    if (!activeUrl) return;
    setLoading(true);
    setLoadError(false);
    setReloadKey((k) => k + 1);
  }, [activeUrl]);

  const openInBrowser = useCallback(() => {
    if (!activeUrl) return;
    window.api.openExternalUrl(activeUrl).catch(() => {});
  }, [activeUrl]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-base-950">
      <div className="flex shrink-0 items-center gap-2 border-b border-base-700 bg-base-900 px-3 py-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-500/15 text-accent-400">
          <Radio size={13} />
        </span>
        <input
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") connect();
          }}
          placeholder="http://localhost:49275"
          className="min-w-0 flex-1 rounded-sm border border-base-700 bg-base-800 px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-accent-500 focus:outline-none"
        />
        <button
          onClick={() => autoDetect(false)}
          disabled={detecting}
          title={t("axetFlowsLive.autoDetect")}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-sm border border-base-700 bg-base-800 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-base-700 disabled:cursor-default disabled:opacity-60"
        >
          <Wand2 size={13} className={detecting ? "animate-pulse" : ""} />
          {t("axetFlowsLive.autoDetect")}
        </button>
        <button
          onClick={connect}
          className="shrink-0 cursor-pointer rounded-sm bg-accent-500 px-3 py-1.5 text-xs font-medium text-accent-on hover:bg-accent-600"
        >
          {t("axetFlowsLive.connect")}
        </button>
        <button
          onClick={reload}
          disabled={!activeUrl}
          title={t("axetFlowsLive.reload")}
          className="flex shrink-0 cursor-pointer items-center justify-center rounded-sm border border-base-700 bg-base-800 p-1.5 text-slate-300 hover:bg-base-700 disabled:cursor-default disabled:opacity-40"
        >
          <RefreshCw size={14} />
        </button>
        <button
          onClick={openInBrowser}
          disabled={!activeUrl}
          title={t("axetFlowsLive.openInBrowser")}
          className="flex shrink-0 cursor-pointer items-center justify-center rounded-sm border border-base-700 bg-base-800 p-1.5 text-slate-300 hover:bg-base-700 disabled:cursor-default disabled:opacity-40"
        >
          <ExternalLink size={14} />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        {!activeUrl && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-base-950 px-6 text-center">
            {detecting ? (
              <span className="text-xs text-slate-500">{t("axetFlowsLive.detecting")}</span>
            ) : (
              <>
                <p className="max-w-sm text-xs text-slate-500">{detectError ?? t("axetFlowsLive.detectFailed")}</p>
                <p className="max-w-sm text-[11px] text-slate-600">{t("axetFlowsLive.manualHint")}</p>
              </>
            )}
          </div>
        )}
        {activeUrl && loading && !loadError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-base-950">
            <span className="text-xs text-slate-500">{t("axetFlowsLive.loading")}</span>
          </div>
        )}
        {activeUrl && loadError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-base-950 px-6 text-center">
            <p className="max-w-sm text-xs text-slate-500">{t("axetFlowsLive.error")}</p>
            <p className="max-w-sm text-[11px] text-slate-600">{t("axetFlowsLive.retrying")}</p>
          </div>
        )}
        {activeUrl && (
          <iframe
            key={reloadKey}
            src={activeUrl}
            title="axet.flows (Live)"
            className="h-full w-full border-0 bg-white"
            onLoad={() => {
              setLoading(false);
              setLoadError(false);
            }}
            onError={() => {
              setLoading(false);
              setLoadError(true);
            }}
          />
        )}
      </div>
    </div>
  );
}
