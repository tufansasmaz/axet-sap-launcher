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

// ============================================================================
// Otomatik doldurma.
//
// Kullanıcı isteği (2026-09-06): *"açılan chromium penceresinde otomatik
// olarak kullanıcı şifre dolsun zaten bağlan dediğimizde biz giriyoruz o
// bilgileri onlarla dolsun ve bağlansın o direkt"*. Kimlik bilgileri zaten
// bağlanma diyaloğunda giriliyor; bir daha yazdırmanın anlamı yok.
//
// Sayfanın yapısını BİLMİYORUZ — IdP Okta olabilir, Azure AD olabilir, SAP'ın
// kendi giriş sayfası olabilir. O yüzden yapısal bir sezgi kullanılıyor:
// görünür bir parola alanı ve ona en yakın metin/e-posta alanı.
//
// Üç şey bilinçli:
//
// 1. `.value = x` YETMİYOR. Bu sayfaların çoğu React/Angular ve doğrudan
//    atama framework'ün kendi state'ini güncellemiyor — alan dolu görünüyor,
//    "Sign in"e basınca "kullanıcı adı boş" diyor. Native setter + input/change
//    olayı bunu çözüyor.
// 2. PAROLA GÖNDERİLDİKTEN SONRA hiçbir şey doldurulmuyor. Ondan sonrası
//    MFA — kod/push ekranı — ve oraya kullanıcı adı yazmaya kalkmak hem
//    saçma hem zararlı olurdu. O ekran kullanıcının.
// 3. Aynı alan bir kereden fazla doldurulmuyor (`data-axet-filled`) ve
//    gönderim sayısı sınırlı. Yanlış bir parolayla döngüye girip HESABI
//    KİLİTLEMEK, bu özelliğin yapabileceği en pahalı hata olurdu.
// ============================================================================

// Kullanıcı adı adımı + parola adımı + biraz pay. Bunun ötesi "form
// gönderiliyor ama sayfa hep geri geliyor" demektir; orada durup pencereyi
// kullanıcıya göstermek doğrusu.
const MAX_AUTOFILL_SUBMITS = 4;

function buildAutofillScript(username: string, password: string): string {
  // Kimlik bilgileri JSON.stringify ile gömülüyor — içindeki tırnak/ters bölü
  // script'i bozmasın diye.
  const u = JSON.stringify(username);
  const p = JSON.stringify(password);
  return `(() => {
  const visible = (el) => !el.disabled && !el.readOnly && (el.offsetParent !== null || el.getClientRects().length > 0);
  const fresh = (el) => !el.dataset.axetFilled;
  const setValue = (el, v) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (setter) { setter.call(el, v); } else { el.value = v; }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dataset.axetFilled = '1';
  };
  const pw = Array.from(document.querySelectorAll('input[type=password]')).filter(visible).filter(fresh)[0];
  const userCandidates = Array.from(
    document.querySelectorAll('input[type=text],input[type=email],input[type=tel],input:not([type])')
  ).filter(visible).filter(fresh).filter((el) => {
    const hay = ((el.name || '') + (el.id || '') + (el.getAttribute('aria-label') || '') + (el.getAttribute('autocomplete') || '')).toLowerCase();
    // Arama kutusu, OTP/doğrulama kodu alanı kullanıcı adı DEĞİLDİR.
    return !/search|otp|code|token|captcha|pin/.test(hay);
  });
  const user = userCandidates[0];
  if (!pw && !user) return 'nofields';
  if (user) setValue(user, ${u});
  if (pw) setValue(pw, ${p});
  const anchor = pw || user;
  const form = anchor.form;
  const scope = form || document;
  const btn = scope.querySelector('button[type=submit],input[type=submit],button:not([type])');
  // Kısa gecikme: framework'ün state'i işlemesine zaman tanıyor, yoksa bazı
  // sayfalar hâlâ boş sanıp gönderimi reddediyor.
  setTimeout(() => {
    try {
      if (btn) { btn.click(); }
      else if (form) { form.requestSubmit ? form.requestSubmit() : form.submit(); }
    } catch (e) { /* gönderim başarısızsa pencere kullanıcıya gösterilecek */ }
  }, 150);
  return pw ? 'password' : 'username';
})()`;
}

export interface SamlLoginOptions {
  baseUrl: string;
  username: string;
  password: string;
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
  // Otomatik doldurma durumu. `lastActionAt`, pencereyi gösterme kararını
  // erteliyor: doldurma AKTİFKEN pencereyi açmak, kullanıcıya bir saniye
  // yanıp sönen ve kendiliğinden ilerleyen bir giriş formu göstermek olurdu.
  let autofillSubmits = 0;
  let passwordSubmitted = false;
  let lastActionAt = started;
  const autofillScript = buildAutofillScript(opts.username, opts.password);

  const tryAutofill = async (): Promise<void> => {
    if (passwordSubmitted || autofillSubmits >= MAX_AUTOFILL_SUBMITS) return;
    if (win.isDestroyed()) return;
    // Parola HTTPS OLMAYAN bir sayfaya asla yazılmaz. Yönlendirme zinciri
    // beklenmedik bir yere giderse doldurma sessizce durur ve pencere
    // kullanıcıya gösterilir — kararı o verir.
    if (!win.webContents.getURL().startsWith("https://")) return;
    // Giriş formu bir iframe içinde olabiliyor; ana çerçeve + alt çerçeveler
    // birlikte taranıyor.
    let frames: Electron.WebFrameMain[] = [];
    try {
      frames = win.webContents.mainFrame.framesInSubtree;
    } catch {
      return;
    }
    for (const frame of frames) {
      let outcome: unknown;
      try {
        outcome = await frame.executeJavaScript(autofillScript, true);
      } catch {
        // Çerçeve gitmiş/erişilemez olabilir — sıradakine geç.
        continue;
      }
      if (outcome === "password" || outcome === "username") {
        autofillSubmits += 1;
        lastActionAt = Date.now();
        if (outcome === "password") passwordSubmitted = true;
        return;
      }
    }
  };

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

    if (!shown) await tryAutofill();

    const elapsed = Date.now() - started;
    // Sessizlik süresi son EYLEMDEN itibaren sayılıyor, açılıştan değil:
    // otomatik doldurma iş yaptığı sürece pencere gizli kalıyor, iş bitince
    // (tipik olarak MFA ekranında) 6 saniye sonra kullanıcıya açılıyor.
    if (!shown && Date.now() - lastActionAt >= SILENT_GRACE_MS) {
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
