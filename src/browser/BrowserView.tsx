// Yerleşik tarayıcı görünümü (spec 2026-10-18 tarayici §2, §6, §7): üst satır
// (Geri, İleri, Yenile/Durdur, adres, Sistem tarayıcısında aç), gövdede sayfa;
// boş durum, yükleme hatası ve çökme gövdede. Sayfanın kendisi BrowserPage'de,
// güvenlik kuralları ana süreçte. Yer imi, sekme, geçmiş listesi YOK.
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ExternalLink, Globe, RotateCw, X } from "lucide-react";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import { useTerminalStore } from "../stores/terminalStoreContext";
import type { TerminalWorkspace } from "../stores/terminalTypes";
import { ICON_BUTTON, TOOL_BUTTON } from "../ui/buttons";
import { INPUT_CLASS } from "../ui/Field";
import {
  browserShortcutOf,
  isBrowserNavAllowed,
  loadErrorKind,
  normalizeAddress,
  readBrowserUrl,
  type BrowserShortcut,
  type LoadErrorKind
} from "../../app-electron/shared/browserLogic";
import BrowserPage, { type PageHandle, type PageState } from "./BrowserPage";
import { ADDRESS_FAILURE_KEY, LOAD_ERROR_KEY } from "./browserText";

type Notice = { tone: "warning" | "success"; key: TranslationKey; params?: Record<string, string | number> };
type Failure = { kind: LoadErrorKind; code: number; url: string };

// Yeni renk yok: mevcut durum jetonları.
const NOTICE_TONE = {
  warning: "text-[var(--status-warning-text)]",
  success: "text-[var(--status-success-text)]"
} as const;

export default function BrowserView({ workspace, visible }: { workspace: TerminalWorkspace; visible: boolean }) {
  const t = useT();
  const { commands } = useTerminalStore();
  const pageRef = useRef<PageHandle | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Kullanıcı adres alanına yazarken sayfanın adresi üstüne yazılmasın.
  const editing = useRef(false);
  const [firstUrl, setFirstUrl] = useState<string | null>(null);
  const [page, setPage] = useState<PageState | null>(null);
  const [address, setAddress] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [crashed, setCrashed] = useState(false);
  const [webContentsId, setWebContentsId] = useState<number | null>(null);

  const open = (url: string) => {
    editing.current = false;
    setFailure(null);
    setCrashed(false);
    setNotice(null);
    setAddress(url);
    if (firstUrl === null) setFirstUrl(url);
    else pageRef.current?.load(url);
  };

  const go = (input: string) => {
    const result = normalizeAddress(input);
    if (result.ok) open(result.url);
    else if (result.reason !== "empty") setNotice({ tone: "warning", key: ADDRESS_FAILURE_KEY[result.reason] });
  };

  const run = (action: BrowserShortcut) => {
    if (action === "focusAddress") {
      inputRef.current?.focus();
      inputRef.current?.select();
      return;
    }
    setFailure(null);
    setCrashed(false);
    if (action === "back") pageRef.current?.back();
    else pageRef.current?.forward();
  };

  const reload = () => {
    if (failure) {
      go(failure.url); // normalizeAddress üzerinden (Minor 1)
      return;
    }
    setCrashed(false);
    pageRef.current?.reload();
  };

  const latest = useRef({ run, webContentsId, visible });
  latest.current = { run, webContentsId, visible };

  // Sayfa odaktayken ana süreç Ctrl+L / Alt+Sol/Sağ'ı iletiyor; indirme reddi de oradan.
  useEffect(() => {
    const offShortcut = window.api.onBrowserShortcut((id, action) => {
      if (id === latest.current.webContentsId) latest.current.run(action);
    });
    const offDownload = window.api.onBrowserDownloadBlocked((id) => {
      const mine = id === null ? latest.current.visible : id === latest.current.webContentsId;
      if (mine) setNotice({ tone: "warning", key: "browser.downloadBlocked" });
    });
    return () => {
      offShortcut();
      offDownload();
    };
  }, []);

  // Odak uygulamadayken: yalnız bu görünüm ekrandayken (spec §7). Başka tuşa dokunulmuyor.
  useEffect(() => {
    if (!visible) return;
    const onKey = (event: KeyboardEvent) => {
      const action = browserShortcutOf({
        type: "keyDown",
        key: event.key,
        control: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        meta: event.metaKey
      });
      if (!action) return;
      // Modal açıkken kısayol çalışmasın (Minor 6).
      if (document.querySelector('[role="dialog"], [aria-modal="true"]')) return;
      event.preventDefault();
      latest.current.run(action);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  // Gizli görünümde ses kapatılır (spec §2 — sayfa takılı kalırken; Minor 2).
  useEffect(() => {
    pageRef.current?.muteAudio(!visible);
  }, [visible]);

  const onState = (next: PageState) => {
    setPage(next);
    // Uyarıyı yalnız adres gerçekten değiştiğinde temizle (gezinme). did-stop-loading,
    // page-title-updated gibi aynı URL'li olaylar uyarıyı silmemeli (fix round 2).
    if (next.url !== page?.url) setNotice(null);
    // Hata sayfasının (chrome-error://) adresi alana ve kayda girmiyor.
    if (!editing.current && isBrowserNavAllowed(next.url)) setAddress(next.url);
    const saved = readBrowserUrl(next.url);
    if (saved && saved !== workspace.browserUrl) commands.setWorkspaceBrowserUrl(workspace.id, saved);
  };

  const onFail = (code: number, url: string) => {
    const kind = loadErrorKind(code);
    if (kind) setFailure({ kind, code, url });
  };

  const loading = page?.loading ?? false;
  const canExternal = !!page && isBrowserNavAllowed(page.url);

  return (
    <section role="region" aria-label={t("browser.region")} className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center gap-1.5 border-b border-line px-2">
        <button
          type="button"
          aria-label={t("browser.back")}
          title={t("browser.back")}
          disabled={!page?.canGoBack}
          onClick={() => run("back")}
          className={ICON_BUTTON}
        >
          <ArrowLeft size={14} aria-hidden />
        </button>
        <button
          type="button"
          aria-label={t("browser.forward")}
          title={t("browser.forward")}
          disabled={!page?.canGoForward}
          onClick={() => run("forward")}
          className={ICON_BUTTON}
        >
          <ArrowRight size={14} aria-hidden />
        </button>
        {loading ? (
          <button type="button" aria-label={t("browser.stop")} title={t("browser.stop")} onClick={() => pageRef.current?.stop()} className={ICON_BUTTON}>
            <X size={14} aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            aria-label={t("browser.reload")}
            title={t("browser.reload")}
            disabled={firstUrl === null}
            onClick={reload}
            className={ICON_BUTTON}
          >
            <RotateCw size={14} aria-hidden />
          </button>
        )}
        <input
          ref={inputRef}
          type="text"
          aria-label={t("browser.address")}
          placeholder={t("browser.addressPlaceholder")}
          value={address}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => {
            editing.current = true;
            setAddress(event.target.value);
          }}
          onBlur={() => {
            // Odak çıkınca editing sıfırlanır ve alan sayfanın güncel adresine döner (Important 1).
            if (!editing.current) return;
            editing.current = false;
            if (page && isBrowserNavAllowed(page.url)) setAddress(page.url);
            else if (failure?.url) setAddress(failure.url);
            // else: loading sırasında mevcut değerde kal (boşaltma).
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              go(address);
            } else if (event.key === "Escape") {
              event.preventDefault();
              editing.current = false;
              // Sayfa adresi yoksa (yükleniyor vb.) yazılanı koru, boşaltma (Minor 5).
              setAddress(page && isBrowserNavAllowed(page.url) ? page.url : (failure?.url ?? address));
              event.currentTarget.blur();
            }
          }}
          className={`${INPUT_CLASS} h-8 min-w-0 flex-1 font-mono text-xs`}
        />
        <button
          type="button"
          aria-label={t("browser.openExternal")}
          disabled={!canExternal}
          onClick={() => {
            if (page && canExternal) void window.api.openExternalUrl(page.url);
          }}
          className={TOOL_BUTTON}
        >
          <ExternalLink size={14} aria-hidden />
          {t("browser.openExternal")}
        </button>
      </div>
      {notice && (
        <p role="status" className={`shrink-0 border-b border-line px-3 py-1 text-2xs ${NOTICE_TONE[notice.tone]}`}>
          {t(notice.key, notice.params)}
        </p>
      )}
      <div className="relative min-h-0 flex-1">
        {firstUrl === null ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <Globe size={28} className="text-slate-500" aria-hidden />
            <p className="text-sm text-slate-200">{t("browser.emptyTitle")}</p>
            <p className="max-w-md text-xs text-slate-400">{t("browser.emptyHint")}</p>
            {workspace.browserUrl && (
              <button type="button" onClick={() => go(workspace.browserUrl ?? "")} className={`${TOOL_BUTTON} max-w-full`}>
                <span className="truncate">{t("browser.lastUrl", { url: workspace.browserUrl })}</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <BrowserPage
              ref={pageRef}
              initialUrl={firstUrl}
              onState={onState}
              onFail={onFail}
              onCrash={() => setCrashed(true)}
              onReady={setWebContentsId}
            />
            {(crashed || failure) && (
              <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-app p-6 text-center">
                {crashed ? (
                  <>
                    <p className="text-sm text-slate-200">{t("browser.crashed")}</p>
                    <button type="button" onClick={reload} className={TOOL_BUTTON}>
                      {t("browser.reloadPage")}
                    </button>
                  </>
                ) : failure ? (
                  <>
                    <p className="text-sm text-slate-200">{t(LOAD_ERROR_KEY[failure.kind], { code: failure.code })}</p>
                    <p className="max-w-full break-all font-mono text-2xs text-slate-400">{failure.url}</p>
                    {/* Sertifika hatasında da yalnız "Yeniden dene": istisna düğmesi YOK (spec §2, §6). */}
                    <button type="button" onClick={reload} className={TOOL_BUTTON}>
                      {t("browser.retry")}
                    </button>
                  </>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
