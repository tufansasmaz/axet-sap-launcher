import { BrowserWindow, session as electronSession, type Cookie } from "electron";

// ============================================================================
// SAML SSO girişi — tarayıcıyı BİZ açıyoruz.
//
// Bu dosyanın var olma sebebi: SAML'li (tipik olarak BTP/cloud) sistemlerde
// Basic Auth ile kimlik doğrulanamıyor — SAP, kimlik bilgilerine hiç bakmadan
// HTTP 200 ile bir HTML giriş sayfası döndürüyor (bkz. adtDiscovery.ts
// `looksLikeSamlLoginPage`). Gerçek oturumu ancak bir tarayıcıda IdP akışını
// tamamlayarak alabiliyoruz.
//
// Eskiden bunun tek yolu skill'deki `login_saml_sso.py` idi: Playwright +
// ayrıca indirilen Chromium (~200 MB), kullanıcının elle `pip install`
// yapması, sonra script'in bastığı `ADT_SAML_COOKIES_FILE=...` satırını elle
// `.conn_adt`'a kopyalaması. Yani "bağlan" dedikten sonra dört manuel adım.
//
// Oysa Electron'un kendisi Chromium. Ayrı bir tarayıcı indirmenin, ayrı bir
// Python çalışma zamanının ve elle kopyalanan bir satırın hiçbirine gerek yok:
// pencereyi burada açıyor, IdP akışını kullanıcıya yaptırıyor ve çerezi
// oturumdan doğrudan okuyoruz.
//
// Üretilen dosyanın ŞEKLİ Python tarafının beklediğiyle birebir aynı olmak
// zorunda — tüketen taraf `auth/saml_auth_provider.py` (`_load_cookies`:
// `cookies` sözlüğü + `session_cookies` listesi) ve `sap_adt_lib.py`
// (`_apply_saml_cookies`: name/value/domain/path/secure). O yüzden buradaki
// alan adları camelCase DEĞİL, Python'un okuduğu adlar.
// ============================================================================

export interface SamlSessionCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
}

export interface SamlCookieJar {
  cookies: Record<string, string>;
  session_cookies: SamlSessionCookie[];
  base_url: string;
  username: string;
  obtained_at: number;
}

export interface SamlLoginResult {
  ok: boolean;
  jar: SamlCookieJar | null;
  // Pencere kullanıcıya gösterildi mi. Gösterilmediyse giriş SESSİZ oldu
  // (IdP oturumu zaten açıktı) — kullanıcıya "hiçbir şey yapmana gerek
  // kalmadı" diyebilmek için sonuca taşınıyor.
  interactive: boolean;
  // "cancelled" = kullanıcı pencereyi kapattı; "timeout" = süre doldu;
  // "certificate" = TLS sertifikası doğrulanamadı; "error" = beklenmeyen.
  reason: "ok" | "cancelled" | "timeout" | "certificate" | "error";
  message: string;
}

// IdP oturumu zaten açıksa akış bu süre içinde kendiliğinden biter ve pencere
// hiç görünmez. Bitmezse pencere gösteriliyor — "arka planda deniyoruz"
// diye kullanıcıyı boş ekrana baktırmamak için kısa tutuldu.
const SILENT_GRACE_MS = 6000;
// Kullanıcı elle giriş yapıyorsa (parola + MFA/push onayı) bu süre gerçekten
// gerekebiliyor.
const INTERACTIVE_TIMEOUT_MS = 180000;
const POLL_INTERVAL_MS = 500;

// Oturumun gerçekten açıldığının kanıtı. Yalnızca "çerez var mı" demek
// yetmiyor: IdP'ye yönlendiren ilk istek de çerez bırakıyor, o hâlde
// yarım kalmış bir akışı başarı sanardık. Python tarafı da aynı çereze
// bakıyor (`saml_auth_provider.py` `get_sap_session_id`).
function hasSapSession(cookies: Cookie[]): boolean {
  return cookies.some((c) => c.name.startsWith("SAP_SESSIONID") || c.name === "MYSAPSSO2");
}

function toJar(cookies: Cookie[], baseUrl: string, username: string): SamlCookieJar {
  const map: Record<string, string> = {};
  const list: SamlSessionCookie[] = [];
  for (const c of cookies) {
    if (!c.name) continue;
    map[c.name] = c.value;
    list.push({
      name: c.name,
      value: c.value,
      domain: c.domain ?? "",
      path: c.path ?? "/",
      secure: c.secure ?? true,
      httpOnly: c.httpOnly ?? false
    });
  }
  return {
    cookies: map,
    session_cookies: list,
    base_url: baseUrl.replace(/\/+$/, ""),
    username,
    obtained_at: Date.now() / 1000
  };
}

export interface SamlLoginOptions {
  baseUrl: string;
  username: string;
  // Oturum bölmesi sistem başına ayrı: iki farklı SAP sistemine iki farklı
  // kullanıcıyla bağlanmak, birinin çerezini ötekine taşımamalı.
  partitionKey: string;
  language?: "tr" | "en";
}

const MSG = {
  tr: {
    ok: "SAML SSO girişi tamamlandı ve oturum çerezi alındı.",
    silent: "SAML SSO girişi arka planda tamamlandı (kimlik sağlayıcı oturumu zaten açıktı).",
    cancelled: "SAML giriş penceresi kapatıldı — oturum alınamadı.",
    timeout: "SAML girişi zaman aşımına uğradı (3 dakika).",
    certificate: "SAML giriş sayfasının TLS sertifikası doğrulanamadı; parola girilecek bir pencere güvenilmeyen bir sertifikayla açılmıyor.",
    error: "SAML giriş penceresi açılamadı"
  },
  en: {
    ok: "SAML SSO login completed and the session cookie was captured.",
    silent: "SAML SSO login completed in the background (the identity provider session was already open).",
    cancelled: "The SAML login window was closed — no session was captured.",
    timeout: "SAML login timed out (3 minutes).",
    certificate: "The TLS certificate of the SAML login page could not be verified; a window where a password is typed is not opened over an untrusted certificate.",
    error: "The SAML login window could not be opened"
  }
} as const;

/**
 * IdP akışını bir Electron penceresinde çalıştırır ve SAP oturum çerezini
 * döndürür. Önce SESSİZ dener (pencere gizli): kurumsal ortamda IdP oturumu
 * çoğu zaman zaten açıktır ve kullanıcının hiçbir şey yapması gerekmez.
 * Sessiz deneme tutmazsa pencere gösterilir.
 */
export async function performSamlLogin(opts: SamlLoginOptions): Promise<SamlLoginResult> {
  const lang = opts.language === "en" ? "en" : "tr";
  const msg = MSG[lang];
  const baseUrl = opts.baseUrl.replace(/\/+$/, "");
  // Kalıcı bölme (`persist:`) BİLEREK: bir kere giriş yapıldıktan sonra
  // IdP oturumu diskte kalıyor ve aynı sisteme sonraki bağlanmalar hiç
  // pencere açmadan tamamlanıyor — kullanıcının istediği "arkada kendi
  // halletsin" davranışının kaynağı bu. Saklanan şey, aynı kullanıcının
  // normal tarayıcısının da sakladığı SSO çerezi.
  const partition = `persist:saml-${opts.partitionKey}`;
  const ses = electronSession.fromPartition(partition);

  // Akışın SONU `/sap/bc/adt/discovery`, yani `application/atomsvc+xml`.
  // Chromium bunu render etmeyip İNDİRME sayar ve varsayılan davranışı bir
  // "farklı kaydet" penceresi açmaktır — üstelik penceremiz gizliyken. Bizi
  // ilgilendiren şey gövde değil, o noktaya gelene kadar toplanan çerez;
  // indirmeyi sessizce iptal ediyoruz.
  // `persist:` oturumu bölme başına TEK bir nesne olduğundan aynı sisteme
  // ikinci kez bağlanmak dinleyiciyi üst üste ekler — önce temizleniyor.
  ses.removeAllListeners("will-download");
  ses.on("will-download", (event) => event.preventDefault());

  // Sertifika HATASI sessizce yutulmuyor. Uygulamanın geri kalanı ADT
  // isteklerinde `rejectUnauthorized: false` kullanıyor, ama orada gönderilen
  // şey zaten bilinen bir kimlik bilgisi; burada kullanıcı parolasını CANLI
  // olarak yabancı bir sayfaya yazıyor. Doğrulanmayan bir sertifikaya karşı
  // pencere açmak, tam olarak ortadaki-adam saldırısının istediği şey olurdu.
  let certificateFailed = false;

  const win = new BrowserWindow({
    width: 520,
    height: 680,
    show: false,
    parent: BrowserWindow.getAllWindows()[0] ?? undefined,
    autoHideMenuBar: true,
    title: "SAP SAML SSO",
    webPreferences: {
      partition,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  let settled = false;
  let closedByUser = false;
  win.on("closed", () => {
    if (!settled) closedByUser = true;
  });

  const onCertError = (
    _event: Electron.Event,
    _url: string,
    _error: string,
    _certificate: Electron.Certificate,
    callback: (isTrusted: boolean) => void
  ) => {
    certificateFailed = true;
    callback(false);
  };
  win.webContents.on("certificate-error", onCertError);

  const finish = (result: SamlLoginResult): SamlLoginResult => {
    settled = true;
    if (!win.isDestroyed()) win.destroy();
    return result;
  };

  try {
    // `loadURL` SAML yönlendirmesinde reddedilebiliyor (ERR_ABORTED) — bu
    // akışın normali, hata değil. Sonucu belirleyen tek şey çerez.
    win.loadURL(`${baseUrl}/sap/bc/adt/discovery`).catch(() => undefined);
  } catch (err) {
    return finish({
      ok: false,
      jar: null,
      interactive: false,
      reason: "error",
      message: `${msg.error}: ${(err as Error).message}`
    });
  }

  const started = Date.now();
  let shown = false;

  for (;;) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    if (closedByUser) {
      return finish({ ok: false, jar: null, interactive: shown, reason: "cancelled", message: msg.cancelled });
    }
    if (certificateFailed) {
      return finish({ ok: false, jar: null, interactive: shown, reason: "certificate", message: msg.certificate });
    }

    let cookies: Cookie[] = [];
    try {
      cookies = await ses.cookies.get({ url: baseUrl });
    } catch {
      // Çerez deposu geçici olarak okunamadıysa bir sonraki turda tekrar
      // denenecek; tek bir okuma hatası akışı bitirmemeli.
      cookies = [];
    }

    if (hasSapSession(cookies)) {
      return finish({
        ok: true,
        jar: toJar(cookies, baseUrl, opts.username),
        interactive: shown,
        reason: "ok",
        message: shown ? msg.ok : msg.silent
      });
    }

    const elapsed = Date.now() - started;
    if (!shown && elapsed >= SILENT_GRACE_MS) {
      // Sessiz deneme tutmadı: kullanıcı giriş yapacak. Pencere ANCAK
      // burada görünüyor.
      shown = true;
      if (!win.isDestroyed()) {
        win.show();
        win.focus();
      }
    }
    if (shown && elapsed >= INTERACTIVE_TIMEOUT_MS) {
      return finish({ ok: false, jar: null, interactive: true, reason: "timeout", message: msg.timeout });
    }
  }
}
