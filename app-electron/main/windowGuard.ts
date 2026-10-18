// Uygulamadaki BÜTÜN webContents'ler için pencere ve navigasyon korumaları.
//
// Ana pencerenin preload'u `window.api`'yi açıyor: dosya yazma, terminal
// açma, çözülmüş SAP parolaları. Bu API'yi alan her sayfa kullanıcının
// yetkisiyle kod çalıştırabilir. Electron'un varsayılanında iki kapı açıktı:
//
//   - `window.open` / `target=_blank` ile açılan çocuk pencere ebeveynin
//     webPreferences'ını, PRELOAD DAHİL, devralıyor.
//   - Ana pencere herhangi bir URL'ye gidebiliyor ve preload o sayfada da
//     yükleniyor.
//
// İkisi de bir DOCX bağlantısıyla ya da gömülü Node-RED'in açtığı bir
// pencereyle tetiklenebiliyordu. Koruma pencere pencere değil
// `web-contents-created` üzerinden kuruluyor: sonradan eklenen bir pencere de
// kendiliğinden korumalı doğuyor.
//
// Saf kısımlar (URL kararları) Electron'a dokunmuyor; testler onları
// doğrudan çağırıyor.

import path from "node:path";
import { fileURLToPath } from "node:url";
import type { App, Session, Shell, WebContents } from "electron";
import type { BrowserShortcut } from "../shared/browserLogic";
import {
  allowWebviewAttach,
  hardenWebviewPreferences,
  installBrowserGuestRules,
  type GuestContents,
  type WebviewAttachParams
} from "./browserGuard";

export interface AppOrigin {
  // Paketlenmiş renderer'ın klasörü (dist). Ana sayfa bunun altındaki index.html.
  distDir: string;
  // Geliştirmede Vite sunucusu; paketlenmiş uygulamada null.
  devOrigin: string | null;
}

/**
 * URL uygulamanın KENDİ ana sayfası mı?
 *
 * Geliştirmede Vite sunucusunun origin'i, paketlenmiş uygulamada yalnızca
 * dist/index.html. dist altındaki başka dosyalar bilerek dışarıda: ana
 * pencerede preload'la birlikte açılacak başka bir sayfamız yok
 * (flow-sandbox.html kendi sandbox'lı penceresinde açılıyor).
 */
export function isAppUrl(rawUrl: string, origin: AppOrigin): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (origin.devOrigin) {
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    try {
      return url.origin === new URL(origin.devOrigin).origin;
    } catch {
      return false;
    }
  }
  if (url.protocol !== "file:") return false;
  // UNC (file://sunucu/...) yolu uygulamanın kendisi olamaz.
  if (url.host !== "") return false;
  let filePath: string;
  try {
    filePath = fileURLToPath(url);
  } catch {
    return false;
  }
  // Windows'ta path.relative büyük/küçük harfe duyarsız karşılaştırıyor ama
  // kalan parçayı hedefin yazımıyla döndürüyor; o yüzden küçültülüyor.
  const rel = path.relative(path.resolve(origin.distDir), path.resolve(filePath));
  return rel.toLowerCase() === "index.html";
}

// Sistem tarayıcısına/posta istemcisine devredilebilecek şemalar. `file:`,
// `ms-*:`, `search-ms:` gibi Windows'un bir programa bağladığı şemalar
// BİLEREK yok: openExternal onlarla yerel bir programı çalıştırabiliyor.
const EXTERNAL_SCHEMES = new Set(["https:", "http:", "mailto:"]);

export function isExternalOpenAllowed(rawUrl: string): boolean {
  if (typeof rawUrl !== "string") return false;
  try {
    return EXTERNAL_SCHEMES.has(new URL(rawUrl).protocol);
  } catch {
    return false;
  }
}

/**
 * SAML giriş penceresinin oturumu mu?
 *
 * O pencere kurumsal IdP'ye gitmek, yönlendirilmek ve form göndermek ZORUNDA;
 * genel navigasyon kilidi onu kırardı. Muafiyet zararsız çünkü pencerenin
 * preload'u yok (`window.api` orada hiç yok) ve `sandbox: true` (bkz.
 * samlLogin.ts). Tanıma oturumun disk yolundan: `persist:saml-<anahtar>`
 * bölmesi `<userData>/Partitions/saml-<anahtar>` altında tutuluyor. Varsayılan
 * oturum hiçbir koşulda muaf değil — ana pencere oradan çalışıyor.
 */
export function isSamlLoginSession(storagePath: string | null | undefined, isDefaultSession: boolean): boolean {
  if (isDefaultSession || !storagePath) return false;
  return /[\\/]Partitions[\\/]saml-[^\\/]+[\\/]?$/i.test(storagePath);
}

export interface WindowGuardDeps {
  app: Pick<App, "on">;
  shell: Pick<Shell, "openExternal">;
  defaultSession: () => Session;
  origin: AppOrigin;
  // Flow sandbox penceresi kendi korumalarını kuruyor (flowSandbox.ts);
  // oradan gelen hiçbir URL sistem tarayıcısına da gitmemeli.
  isFlowSandbox: (contents: WebContents) => boolean;
  log?: (event: string, detail: Record<string, string>) => void;
  // Yerleşik tarayıcı (spec 2026-10-18 tarayici §4). Verilmezse bütün
  // webview'lar reddediliyor. Webview yalnız ana pencerede, yalnız
  // persist:ntt-tarayici bölümünde; sayfasının kuralları browserGuard.ts'te.
  browser?: {
    isMainWindow: (contents: WebContents) => boolean;
    // Sözleşme: yalnız getType() === "webview", oturumu persist:ntt-tarayici
    // ve ana pencereye bağlı (hostWebContents) bir webContents için true;
    // ana pencere ya da başka bir pencere için ASLA. windowGuard yine de tipi,
    // Flow sandbox'ı ve ana pencereyi kendisi denetliyor: bu yüklem guest
    // kümesini yalnız daraltabilir, genişletemez (yanlış true ana pencerenin
    // "yalnız kendi sayfası" korumasını kaldırırdı).
    isGuest: (contents: WebContents) => boolean;
    log: (event: string, detail: Record<string, string>) => void;
    onShortcut: (contents: WebContents, action: BrowserShortcut) => void;
  };
}

/** Kuralları kurulamayan guest: hiçbir yere gidemez, pencere açamaz, webview takamaz. */
function lockBrokenGuest(contents: WebContents): void {
  const steps = [
    () => contents.setWindowOpenHandler(() => ({ action: "deny" })),
    () => contents.on("will-navigate", (event) => event.preventDefault()),
    () => contents.on("will-redirect", (event) => event.preventDefault()),
    () => contents.on("will-attach-webview", (event) => event.preventDefault())
  ];
  for (const step of steps) {
    try {
      step();
    } catch {
      // bir adım düşerse ötekiler yine kurulsun
    }
  }
}

export function installWindowGuards(deps: WindowGuardDeps): void {
  deps.app.on("web-contents-created", (_event, contents) => {
    const browser = deps.browser;
    // Yerleşik tarayıcının sayfası (webview, bizim bölüm): uygulamanın "yalnız
    // kendi sayfası" kuralı ve "bağlantı sistem tarayıcısına" kuralı ona
    // UYGULANMIYOR; yerine tarayıcı kuralı (spec 2026-10-18 tarayici §4.4).
    // Preload'u yok, window.api hiç yok.
    // Sıra bilerek: önce kendi denetimlerimiz (tip, Flow sandbox, ana
    // pencere), en son enjekte edilen yüklem. Herhangi bir hata: guest değil.
    let guest = false;
    try {
      guest =
        !!browser &&
        contents.getType() === "webview" &&
        !deps.isFlowSandbox(contents) &&
        !browser.isMainWindow(contents) &&
        browser.isGuest(contents);
    } catch {
      guest = false;
    }
    if (browser && guest) {
      try {
        installBrowserGuestRules(contents as unknown as GuestContents, {
          log: browser.log,
          onShortcut: (action) => browser.onShortcut(contents, action)
        });
      } catch {
        // Kurallar yarıda kaldı: kısmen kurulmuş bir "izin" yolu kalmasın diye
        // sayfa kilitleniyor. Her gezinme ve yönlendirme engelleniyor, yeni
        // pencere işleyicisi yalnız deny dönen bir işleyiciyle değiştiriliyor,
        // webview takma reddediliyor. Günlükte yalnız sonuç (§4.7: adres yok).
        lockBrokenGuest(contents);
        try {
          browser.log("tarayici.kural-hatasi", { sonuc: "ret" });
        } catch {
          // günlük hatası kilidi değiştirmesin
        }
      }
      return;
    }

    // Her webContents için: yeni pencere HİÇBİR ZAMAN açılmıyor. http(s) ve
    // mailto bağlantıları sistem tarayıcısına/posta istemcisine devrediliyor;
    // böylece Node-RED'in "yeni sekmede aç"ı gibi meşru istekler de
    // kaybolmuyor, ama preload'u devralan bir çocuk pencere asla doğmuyor.
    contents.setWindowOpenHandler(({ url }) => {
      if (!deps.isFlowSandbox(contents) && isExternalOpenAllowed(url)) {
        deps.shell.openExternal(url).catch(() => undefined);
      } else {
        deps.log?.("pencere-reddedildi", { url: url.slice(0, 200) });
      }
      return { action: "deny" };
    });

    // Tek giriş kapısı (spec 2026-10-18 tarayici §4.1): yalnız ana pencere,
    // yalnız bizim bölüm (params ve webPreferences'ta) ve http(s)/boş
    // başlangıç adresi; izinde ayarlar beyaz listeyle yeniden yazılıyor.
    // Flow sandbox, SAML ve başka her pencere: ret.
    contents.on("will-attach-webview", (event, webPreferences, params) => {
      const prefs = webPreferences as unknown as Record<string, unknown>;
      let allowed = false;
      try {
        allowed =
          !!browser &&
          !deps.isFlowSandbox(contents) &&
          browser.isMainWindow(contents) &&
          allowWebviewAttach(params as WebviewAttachParams, prefs);
      } catch {
        allowed = false;
      }
      if (!allowed) {
        event.preventDefault();
        return;
      }
      hardenWebviewPreferences(prefs);
    });

    let exempt = false;
    try {
      const ses = contents.session;
      exempt = isSamlLoginSession(ses.getStoragePath(), ses === deps.defaultSession());
    } catch {
      exempt = false;
    }
    if (exempt) return;

    // Ana çerçeve navigasyonu ve sunucu yönlendirmesi: uygulamanın kendi
    // sayfası dışında hiçbir yere. `loadURL`/`loadFile` ile başlatılan
    // navigasyon `will-navigate` üretmiyor, yani uygulamanın kendi yüklemesi
    // bundan etkilenmiyor. Alt çerçeveler (Node-RED iframe'i) kapsam dışı:
    // preload yalnızca ana çerçevede çalışıyor ve iframe'in üst pencereyi
    // götürmesi sandbox özniteliğiyle kapalı (bkz. AxetFlowsLiveHome.tsx).
    const blockForeign = (event: { preventDefault: () => void }, url: string, kind: string) => {
      if (isAppUrl(url, deps.origin)) return;
      event.preventDefault();
      deps.log?.("navigasyon-engellendi", { tur: kind, url: url.slice(0, 200) });
    };
    contents.on("will-navigate", (event) => blockForeign(event, event.url, "navigate"));
    contents.on("will-redirect", (event) => {
      // will-redirect alt çerçeve yönlendirmelerinde de geliyor; iframe'in
      // kendi içindeki yönlendirmeleri engellenmiyor (yukarıdaki not).
      if (!event.isMainFrame) return;
      blockForeign(event, event.url, "redirect");
    });
  });
}
