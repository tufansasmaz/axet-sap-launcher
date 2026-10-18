// Yerleşik tarayıcının <webview>'ı (spec 2026-10-18 tarayici §4). Güvenlik
// burada DEĞİL, ana süreçte zorlanıyor (windowGuard → browserGuard): bu
// dosya yalnız bölümü ve ilk adresi veriyor, webview'a ayar özniteliği
// eklenmiyor. `allowpopups`: yeni pencere istekleri ana sürecin işleyicisine
// ulaşsın diye; işleyici her zaman reddedip aynı sayfada açıyor.
// Testler bu modülü sahtesiyle değiştiriyor (jsdom'da webview yok).
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { BROWSER_PARTITION } from "../../app-electron/shared/browserLogic";

export interface PageState {
  url: string;
  title: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface PageHandle {
  load(url: string): void;
  back(): void;
  forward(): void;
  reload(): void;
  stop(): void;
  muteAudio(muted: boolean): void;
  webContentsId(): number | null;
}

export interface PageProps {
  initialUrl: string;
  onState(state: PageState): void;
  onFail(code: number, url: string): void;
  onCrash(): void;
  onReady(webContentsId: number): void;
}

interface WebviewElement extends HTMLElement {
  src: string;
  loadURL(url: string): Promise<void>;
  goBack(): void;
  goForward(): void;
  reload(): void;
  stop(): void;
  setAudioMuted(muted: boolean): void;
  canGoBack(): boolean;
  canGoForward(): boolean;
  isLoading(): boolean;
  getURL(): string;
  getTitle(): string;
  getWebContentsId(): number;
}

type FailEvent = Event & { errorCode: number; validatedURL: string; isMainFrame: boolean };

const STATE_EVENTS = ["did-start-loading", "did-stop-loading", "did-navigate", "did-navigate-in-page", "page-title-updated"] as const;

const BrowserPage = forwardRef(function BrowserPage({ initialUrl, onState, onFail, onCrash, onReady }: PageProps, ref: Ref<PageHandle>) {
  const element = useRef<WebviewElement | null>(null);
  const ready = useRef(false);
  const handlers = useRef({ onState, onFail, onCrash, onReady });
  handlers.current = { onState, onFail, onCrash, onReady };
  // İlk adres bir kez; sonrakiler loadURL ile (src değişseydi sayfa baştan kurulurdu).
  const [src] = useState(initialUrl);

  useImperativeHandle(
    ref,
    () => ({
      load: (url) => {
        const view = element.current;
        if (!view) return;
        // dom-ready'den önce loadURL fırlatıyor; o anda src yeterli.
        if (ready.current) view.loadURL(url).catch(() => undefined);
        else view.src = url;
      },
      back: () => {
        const view = element.current;
        if (view && ready.current && view.canGoBack()) view.goBack();
      },
      forward: () => {
        const view = element.current;
        if (view && ready.current && view.canGoForward()) view.goForward();
      },
      reload: () => {
        if (ready.current) element.current?.reload();
      },
      stop: () => {
        if (ready.current) element.current?.stop();
      },
      muteAudio: (muted: boolean) => {
        if (element.current && ready.current) {
          try { element.current.setAudioMuted(muted); } catch { /* webview sökülürken */ }
        }
      },
      webContentsId: () => (element.current && ready.current ? element.current.getWebContentsId() : null)
    }),
    []
  );

  useEffect(() => {
    const view = element.current;
    if (!view) return;
    const push = () => {
      if (!ready.current) return;
      try {
        handlers.current.onState({
          url: view.getURL(),
          title: view.getTitle(),
          loading: view.isLoading(),
          canGoBack: view.canGoBack(),
          canGoForward: view.canGoForward()
        });
      } catch {
        // webview sökülürken
      }
    };
    const onDomReady = () => {
      if (!ready.current) {
        ready.current = true;
        handlers.current.onReady(view.getWebContentsId());
      }
      push();
    };
    const onFailLoad = (event: Event) => {
      const fail = event as FailEvent;
      if (fail.isMainFrame) handlers.current.onFail(fail.errorCode, fail.validatedURL);
    };
    const onGone = () => handlers.current.onCrash();
    view.addEventListener("dom-ready", onDomReady);
    for (const name of STATE_EVENTS) view.addEventListener(name, push);
    view.addEventListener("did-fail-load", onFailLoad);
    view.addEventListener("render-process-gone", onGone);
    return () => {
      view.removeEventListener("dom-ready", onDomReady);
      for (const name of STATE_EVENTS) view.removeEventListener(name, push);
      view.removeEventListener("did-fail-load", onFailLoad);
      view.removeEventListener("render-process-gone", onGone);
    };
  }, []);

  return (
    <webview
      ref={element as unknown as Ref<HTMLWebViewElement>}
      src={src}
      partition={BROWSER_PARTITION}
      allowpopups={"true" as unknown as boolean}
      className="h-full w-full"
    />
  );
});

export default BrowserPage;
