"""NTT Studio: motorun SAP oturumuna TLS doğrulaması + sertifika sabitleme.

Motor (`sap_adt_lib.SAPADTClient`) ADT isteklerini bir `requests.Session`
üzerinden yapıyor ve `session.verify` varsayılan olarak False
(`ADT_SAP_SSL_VERIFY`); kimlik doğrulama sağlayıcısı da isteklere ayrıca
`verify=False` geçiyor (auth/i_auth_provider.py). Yani Basic Auth başlığı,
araya giren HERHANGİ bir sunucuya gidiyordu. Bu modül motor dosyalarına
dokunmadan (vendored, bkz. CLAUDE.md) oturuma iki `HTTPAdapter` monte ediyor:

  * SAP sisteminin kendi adresine (`https://host:port/`) — pin VARSA:
    urllib3 `assert_fingerprint` ile sunucu sertifikasının SHA-256 parmak izi
    (DER) pin'e eşit olmalı. Zincir bu yolda denetlenmiyor (CERT_NONE):
    kurum içi CA'lı ya da kendinden imzalı SAP sistemlerinde pin'in var olma
    sebebi zaten zincirin tutmaması.
  * Geri kalan her `https://` adrese (ve pin YOKSA SAP adresine de) —
    `verify=True`: zincir + host adı, istek ne derse desin.

Pin kaynağı, sırasıyla: bu sistemin `.conn_adt` dosyasındaki
`ADT_SAP_CERT_SHA256`, yoksa ortamdaki aynı anahtar. NTT Studio bu anahtarı
her bağlanışta (boş da olsa) yazıyor; pin, kullanıcının NTT Studio'da
onayladığı ya da zinciri doğrulanmış sertifikanın parmak izi.

Kural Node tarafıyla (app-electron/main/tlsPin.ts) aynı ama birebir değil:
Node "zincir VEYA pin" diyor; burada pin varsa YALNIZCA pin. Sertifika
yenilenirse bu süreç yeniden bağlanana kadar reddeder — NTT Studio yeniden
bağlanırken yeni parmak izini ölçüp `.conn_adt`'ye yazıyor. Açık kalmak yerine
kapalı kalmayı seçen bir fark.

Kullanım (sarmalayıcı sunucular, motor içe aktarıldıktan hemen sonra):
    import ntt_tls_pin
    ntt_tls_pin.install()

Süreç geneli kip (`install_global`, bkz. aşağıdaki bölüm): `install()` yalnızca
motorun oturumunu koruyor; skill script'leri ise kendi `requests` çağrılarında
`verify=False` yazıyor (login_saml_sso.py, auth/jwt_auth_provider.py,
clean_core_checker.py, sap_docs_search.py ...). NTT Studio'nun ajan ortamına
verdiği `PYTHONPATH`'teki `python-site/sitecustomize.py`, `requests` içe
aktarıldığı anda `install_global()`'ı çağırıyor; o da aynı kuralı
`HTTPAdapter.send` düzeyinde, süreçteki HER oturuma uyguluyor.
"""

from __future__ import annotations

import os
import re
import ssl
import sys
import threading
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

from requests.adapters import HTTPAdapter

PIN_KEY = "ADT_SAP_CERT_SHA256"
_HEX = re.compile(r"[^0-9a-fA-F]")
_KEY_LINE = re.compile(r"^\s*([A-Z_0-9]+)\s*=\s*(.*?)\s*$")


def normalize_fingerprint(value: Optional[str]) -> Optional[str]:
    """Yalnızca onaltılık, küçük harf, tam 64 hane (SHA-256); değilse None.

    "AB:CD:..." biçimi de kabul — biçim farkı yüzünden meşru bir pin'in
    tanınmaması "doğrulama yok"a değil "hep ret"e dönüşürdü, o da
    kullanıcıyı pin'i elle silmeye iterdi.
    """
    if not value:
        return None
    hexed = _HEX.sub("", value).lower()
    return hexed if len(hexed) == 64 else None


def _check_urllib3() -> None:
    """urllib3 SHA-256 parmak izini tanımıyorsa sessizce pin'siz kalma, dur.

    `assert_fingerprint` parmak izinin türünü uzunluğundan çıkarıyor
    (32=md5, 40=sha1, 64=sha256). Bu eşleme toolkit'in izin verdiği her
    sürümde var (requests>=2.25 → urllib3>=1.21.1; ölçülen: 2.7.0), yine de
    yoksa ADT isteği gitmeden hata vermek, pin'i yok saymaktan iyi.
    """
    try:
        from urllib3.util import ssl_ as _ssl_
    except Exception as exc:  # pragma: no cover - urllib3 requests'in bağımlılığı
        raise RuntimeError(f"NTT Studio TLS: urllib3 yüklenemedi: {exc}") from exc
    hashes = getattr(_ssl_, "HASHFUNC_MAP", {})
    if 64 not in hashes:
        raise RuntimeError("NTT Studio TLS: urllib3 SHA-256 parmak izini desteklemiyor; pin uygulanamaz")


def _conn_file() -> Optional[Path]:
    """Motorun kullandığı .conn_adt (motorun kendi arama kuralıyla)."""
    try:
        import sap_adt_lib  # motorun modülü; bu klasörde

        path = sap_adt_lib.find_conn_file()
        return Path(path) if path else None
    except Exception:
        return None


def _pin_from_file(path: Optional[Path]) -> Optional[str]:
    if not path or not path.is_file():
        return None
    try:
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            match = _KEY_LINE.match(line)
            if match and match.group(1) == PIN_KEY:
                # Anahtar dosyada VAR ama boşsa bu, "bu sistem için pin yok"
                # demek; ortamdaki (başka bir sistemden kalmış olabilecek)
                # değere düşülmüyor.
                return normalize_fingerprint(match.group(2).strip().strip("'\"")) or ""
    except OSError:
        return None
    return None


def current_pin() -> Optional[str]:
    """Bu süreç için geçerli pin: önce .conn_adt, sonra ortam."""
    from_file = _pin_from_file(_conn_file())
    if from_file is not None:
        return from_file or None
    return normalize_fingerprint(os.environ.get(PIN_KEY))


def _pool_settings(old: object) -> dict:
    """Motorun kendi adaptörünün yeniden deneme / havuz ayarlarını koru."""
    settings: dict = {}
    if isinstance(old, HTTPAdapter):
        settings["max_retries"] = old.max_retries
        settings["pool_connections"] = getattr(old, "_pool_connections", 10)
        settings["pool_maxsize"] = getattr(old, "_pool_maxsize", 10)
        settings["pool_block"] = getattr(old, "_pool_block", False)
    return settings


class ChainVerifyingAdapter(HTTPAdapter):
    """Zincir + host adı doğrulaması ZORUNLU; çağıranın verify=False'u yok sayılır.

    Bir CA dosyası/klasörü yolu (str) verilmişse o korunuyor: kullanıcının
    `ADT_SAP_SSL_VERIFY=<kurum CA'sı>` ile daha sıkı bir güven listesi
    vermesi meşru.
    """

    def send(self, request, stream=False, timeout=None, verify=True, cert=None, proxies=None):
        if not isinstance(verify, str):
            verify = True
        return super().send(request, stream=stream, timeout=timeout, verify=verify, cert=cert, proxies=proxies)


class PinnedAdapter(HTTPAdapter):
    """Sunucu sertifikasının SHA-256'sı pin'e eşit değilse bağlantı düşer.

    urllib3 parmak izini el sıkışmanın hemen ardından, istek yazılmadan
    denetliyor; eşleşmezse soketi kapatıp SSLError fırlatıyor — Authorization
    başlığı hiç gönderilmiyor.
    """

    # Süreç geneli kipte bu adaptörün isteği yeniden yönlendirilmiyor: kararı
    # zaten verilmiş (bkz. _global_send).
    _ntt_delegate = True

    def __init__(self, fingerprint: str, **kwargs):
        # init_poolmanager, HTTPAdapter.__init__ içinden çağrılıyor; parmak izi
        # ondan ÖNCE hazır olmalı.
        self._ntt_fingerprint = fingerprint
        super().__init__(**kwargs)

    def init_poolmanager(self, connections, maxsize, block=False, **pool_kwargs):
        pool_kwargs["assert_fingerprint"] = self._ntt_fingerprint
        super().init_poolmanager(connections, maxsize, block=block, **pool_kwargs)

    def proxy_manager_for(self, proxy, **proxy_kwargs):
        # Vekil sunucu (HTTPS_PROXY / kurum proxy'si) üzerinden giden istek
        # `self.poolmanager`'ı DEĞİL, burada kurulan ayrı bir ProxyManager'ı
        # kullanıyor ve requests ona init_poolmanager'daki anahtarları
        # taşımıyor. Bu satır olmadan vekil üzerinden giden istek CERT_NONE +
        # parmak izi yok, yani HİÇ doğrulanmadan gidiyordu (yerel CONNECT
        # vekiliyle ölçüldü, bkz. test_ntt_tls_global.py).
        proxy_kwargs["assert_fingerprint"] = self._ntt_fingerprint
        return super().proxy_manager_for(proxy, **proxy_kwargs)

    def send(self, request, stream=False, timeout=None, verify=True, cert=None, proxies=None):
        # CERT_NONE + assert_fingerprint: zincir tutmayan (pin'in var olma
        # sebebi) sertifika pin'le kabul ediliyor. verify=True bırakılsaydı
        # urllib3 ÖNCE zinciri isterdi ve pin hiçbir işe yaramazdı.
        return super().send(request, stream=stream, timeout=timeout, verify=False, cert=cert, proxies=proxies)


def _prefixes_for(url: str) -> list[str]:
    parsed = urlparse(url or "")
    if parsed.scheme.lower() != "https" or not parsed.hostname:
        return []
    host = parsed.hostname.lower()
    if ":" in host:  # IPv6
        host = f"[{host}]"
    port = parsed.port or 443
    # Sondaki "/" şart: "https://h:4430" öneki "https://h:44300"yı da tutardı.
    prefixes = [f"https://{host}:{port}/"]
    if port == 443:
        prefixes.append(f"https://{host}/")
    return prefixes


def harden_session(session, url: str, pin: Optional[str]) -> None:
    """Oturuma adaptörleri monte eder. requests en uzun öneki seçiyor, yani
    SAP adresi için pin adaptörü, geri kalan her https için zincir adaptörü."""
    settings = _pool_settings(session.adapters.get("https://"))
    session.mount("https://", ChainVerifyingAdapter(**settings))
    fingerprint = normalize_fingerprint(pin)
    if fingerprint:
        _check_urllib3()
        for prefix in _prefixes_for(url):
            session.mount(prefix, PinnedAdapter(fingerprint, **settings))


_installed = False


def install() -> None:
    """`SAPADTClient` her oturum kurduğunda adaptörleri monte et.

    Sınıf düzeyinde sarılıyor, çünkü istemci motorun birden çok yerinde
    (sap_client.SAPClient dahil) yaratılıyor ve sistem değişiminde yeniden
    kuruluyor; pin de o anda, o sistemin .conn_adt'sinden okunuyor.
    """
    global _installed
    if _installed:
        return
    import sap_adt_lib

    original = sap_adt_lib.SAPADTClient.__init__

    def __init__(self, *args, **kwargs):
        original(self, *args, **kwargs)
        session = getattr(self, "session", None)
        if session is not None:
            harden_session(session, getattr(self, "url", "") or "", current_pin())

    __init__.__wrapped__ = original  # type: ignore[attr-defined]
    sap_adt_lib.SAPADTClient.__init__ = __init__
    _installed = True


# ---------------------------------------------------------------------------
# Süreç geneli kip: sitecustomize.py → install_global()
# ---------------------------------------------------------------------------
# `install()` yalnızca motorun `SAPADTClient` oturumunu sarıyor. Skill
# script'leri ise kendi oturumlarını açıp `verify=False` yazıyor:
#   login_saml_sso.py        session.verify = False  (SAP çerezleriyle ADT'ye)
#   auth/jwt_auth_provider   requests.post(token_url, verify=False) (istemci sırrı)
#   clean_core_checker.py, sap_docs_search.py ...  verify=False
# Motorun içinden çağrılan jwt sağlayıcısı bile `install()`'ın dışında kalıyor:
# modül düzeyindeki `requests.post` motorun oturumunu kullanmıyor.
#
# Vendored dosyalara dokunmamak için kural sınıf düzeyinde, `HTTPAdapter.send`
# üzerinde: her https isteği için
#   * SAP adresi (.conn_adt `ADT_SAP_URL`) + pin var → pin (PinnedAdapter)
#   * aksi hâlde çağıran doğrulamayı KAPATMIŞSA (verify=False) → açılıyor:
#       - REQUESTS_CA_BUNDLE / CURL_CA_BUNDLE bir dosya/klasörse o (requests'in
#         verify=True'da da yaptığı şey),
#       - yoksa işletim sisteminin güven deposu (+ certifi).
#   * çağıran kendisi verify=True ya da bir CA yolu verdiyse DOKUNULMUYOR.
#
# İşletim sistemi deposu kararı: verify=False yazan script'lerin çoğu kurum
# ağında TLS denetleyen bir vekilin (kurum CA'sı Windows deposunda, certifi'de
# YOK) arkasında çalışıyor. Yalnız certifi'ye zorlamak o ağlarda doğrulamayı
# açmayı değil script'i tamamen kırmayı getirirdi. `ssl.create_default_context()`
# Windows'ta kullanıcının ve makinenin ROOT/CA depolarını yüklüyor; requests
# `verify=True`'da buna certifi'yi de ekliyor. Bedeli: eski sürümlerin
# kullanıcı Root deposuna kurduğu kendinden imzalı SAP sertifikaları (O1, artık
# kurulmuyor) bu yolda da güvenilir sayılıyor — onlar yalnızca o SAP'nin kendi
# sertifikası, kötüye kullanmak o sunucunun özel anahtarını istiyor.
#
# Kapsamadığı: `python -I/-E/-S` (sitecustomize/PYTHONPATH okunmuyor),
# `._pth`'li gömülü Python'lar (PYTHONPATH'i yok sayıyor — köprüler zaten
# SAP'ye HTTP'den gitmiyor), requests dışı istemciler (urllib3'ü doğrudan,
# httpx, aiohttp, `ssl._create_unverified_context` ile urllib).

ENV_BUNDLE_KEYS = ("REQUESTS_CA_BUNDLE", "CURL_CA_BUNDLE")
_CONN_NAME = ".conn_adt"
_URL_KEY = "ADT_SAP_URL"
_OS_CONTEXT: Optional[ssl.SSLContext] = None


def _os_trust_context() -> ssl.SSLContext:
    """İşletim sisteminin güven deposunu yüklemiş bağlam (süreç başına bir kez)."""
    global _OS_CONTEXT
    if _OS_CONTEXT is None:
        _OS_CONTEXT = ssl.create_default_context()
    return _OS_CONTEXT


class OsTrustAdapter(HTTPAdapter):
    """Zincir + host adı, işletim sisteminin güven deposuyla (+ certifi)."""

    _ntt_delegate = True

    def init_poolmanager(self, connections, maxsize, block=False, **pool_kwargs):
        pool_kwargs["ssl_context"] = _os_trust_context()
        super().init_poolmanager(connections, maxsize, block=block, **pool_kwargs)

    def proxy_manager_for(self, proxy, **proxy_kwargs):
        # PinnedAdapter.proxy_manager_for ile aynı sebep: vekil yolu
        # init_poolmanager'daki bağlamı almıyor.
        proxy_kwargs["ssl_context"] = _os_trust_context()
        return super().proxy_manager_for(proxy, **proxy_kwargs)

    def send(self, request, stream=False, timeout=None, verify=True, cert=None, proxies=None):
        return super().send(request, stream=stream, timeout=timeout, verify=True, cert=cert, proxies=proxies)


def _candidate_dirs():
    """Motorun `find_conn_file` sırası; motoru İÇE AKTARMADAN.

    `sap_adt_lib`'i içe aktarmak yan etkili (içe aktarılırken .conn_adt'yi
    bulup ortama yüklüyor); `requests` kullanan her script'e bunu yaptırmak
    olmazdı. ADT_CWD başta: NTT Studio 8787 sunucusuna projeyi onunla söylüyor.
    """
    for key in ("ADT_CWD", "CLAUDE_CWD", "INIT_CWD", "COPILOT_CWD"):
        value = os.environ.get(key)
        if value:
            yield Path(value)
    try:
        cwd = Path.cwd()
    except OSError:
        cwd = None
    if cwd is not None:
        text = str(cwd)
        if ".claude" in text or "plugins" in text:
            for parent in list(cwd.parents)[:5]:
                yield parent
        yield cwd
    value = os.environ.get("PWD")
    if value:
        yield Path(value)


def _find_conn_file_light() -> Optional[Path]:
    engine = sys.modules.get("sap_adt_lib")
    if engine is not None:
        # Motor zaten yüklüyse ONUN seçtiği dosya (açık çalışma klasörü dahil):
        # pin'in ait olduğu sistem, motorun konuştuğu sistem olmalı.
        try:
            path = Path(engine.find_conn_file())
            if path.is_file():
                return path
        except Exception:
            pass
    for base in _candidate_dirs():
        try:
            candidate = base / _CONN_NAME
            if candidate.is_file():
                return candidate
        except OSError:
            continue
    return None


_PARSE_CACHE: dict = {}


def _read_conn_values(path: Path) -> dict:
    """Yalnızca URL ve pin anahtarları; (yol, mtime) ile önbellekte."""
    try:
        stamp = path.stat().st_mtime_ns
    except OSError:
        return {}
    key = str(path)
    cached = _PARSE_CACHE.get(key)
    if cached and cached[0] == stamp:
        return cached[1]
    values: dict = {}
    try:
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            match = _KEY_LINE.match(line)
            if match and match.group(1) in (_URL_KEY, PIN_KEY):
                values[match.group(1)] = match.group(2).strip().strip("'\"")
    except OSError:
        return {}
    _PARSE_CACHE[key] = (stamp, values)
    return values


def _host_port(url: str) -> Optional[tuple]:
    try:
        parsed = urlparse(url or "")
        if parsed.scheme.lower() != "https" or not parsed.hostname:
            return None
        return parsed.hostname.lower(), parsed.port or 443
    except ValueError:
        return None


def sap_target() -> tuple:
    """((host, port) | None, pin | None) — bu süreç için SAP adresi ve pin'i.

    Pin kuralı `current_pin()` ile aynı: anahtar dosyada VARSA (boş da olsa)
    ortama düşülmüyor. URL ile pin aynı dosyadan geldiği için yanlış dosya
    seçilse bile bir pin başka bir adrese uygulanamıyor; en kötü sonuç ret.
    """
    path = _find_conn_file_light()
    values = _read_conn_values(path) if path else {}
    url = values.get(_URL_KEY) or os.environ.get(_URL_KEY) or ""
    if PIN_KEY in values:
        pin = normalize_fingerprint(values[PIN_KEY])
    else:
        pin = normalize_fingerprint(os.environ.get(PIN_KEY))
    return _host_port(url), pin


def _env_ca_bundle() -> Optional[str]:
    for key in ENV_BUNDLE_KEYS:
        value = os.environ.get(key)
        if value and os.path.exists(value):
            return value
    return None


_DELEGATE_LOCK = threading.Lock()


def _delegate(adapter, key: tuple, factory):
    """Çağıran adaptörün yeniden deneme/havuz ayarlarıyla, ona bağlı tek kopya."""
    delegates = adapter.__dict__.get("_ntt_delegates")
    if delegates is None or key not in delegates:
        with _DELEGATE_LOCK:
            delegates = adapter.__dict__.setdefault("_ntt_delegates", {})
            if key not in delegates:
                delegates[key] = factory(_pool_settings(adapter))
    return delegates[key]


def _explain(exc, request, why: str):
    """SSLError'ı aynı sınıfla, sebebi söyleyen bir notla yeniden kur.

    Not olmadan ajan "verify=False yazdım, neden SSL hatası?" deyip script'i
    başka bir istemciyle yeniden yazmaya kalkıyor; asıl çare NTT Studio'da
    sertifikayı onaylamak.
    """
    from requests.exceptions import SSLError

    message = (
        f"NTT Studio TLS: {why}. Çözüm doğrulamayı kapatmak değil; SAP "
        f"sisteminin sertifikasını NTT Studio'da onaylayıp yeniden bağlanmak. "
        f"Ayrıntı: {exc}"
    )
    return SSLError(message, request=request)


def _global_send(original, adapter, request, stream, timeout, verify, cert, proxies):
    def passthrough(v):
        return original(adapter, request, stream=stream, timeout=timeout, verify=v, cert=cert, proxies=proxies)

    url = getattr(request, "url", None) or ""
    if getattr(adapter, "_ntt_delegate", False) or url[:8].lower() != "https://":
        return passthrough(verify)

    from requests.exceptions import SSLError

    sap, pin = sap_target()
    if pin and sap is not None and _host_port(url) == sap:
        _check_urllib3()
        pinned = _delegate(adapter, ("pin", pin), lambda s: PinnedAdapter(pin, **s))
        try:
            return pinned.send(request, stream=stream, timeout=timeout, verify=False, cert=cert, proxies=proxies)
        except SSLError as exc:
            raise _explain(exc, request, "SAP sertifikası onaylı parmak iziyle eşleşmiyor") from exc

    if verify is True or isinstance(verify, str):
        return passthrough(verify)

    try:
        bundle = _env_ca_bundle()
        if bundle:
            return passthrough(bundle)
        trusted = _delegate(adapter, ("os",), lambda s: OsTrustAdapter(**s))
        return trusted.send(request, stream=stream, timeout=timeout, verify=True, cert=cert, proxies=proxies)
    except SSLError as exc:
        raise _explain(exc, request, "verify=False yok sayıldı, zincir + host adı zorunlu") from exc


_global_installed = False


def install_global() -> bool:
    """`HTTPAdapter.send`'i süreç genelinde sar. İkinci çağrı bir şey yapmaz.

    Alt sınıflar (motorunki, ChainVerifyingAdapter, script'lerinki)
    `super().send` üzerinden buraya düşüyor; PinnedAdapter ve OsTrustAdapter
    `_ntt_delegate` ile doğrudan geçiyor (karar zaten verilmiş).
    """
    global _global_installed
    if _global_installed:
        return False
    original_send = HTTPAdapter.send
    original_close = HTTPAdapter.close

    def send(self, request, stream=False, timeout=None, verify=True, cert=None, proxies=None):
        return _global_send(original_send, self, request, stream, timeout, verify, cert, proxies)

    def close(self):
        # Vekil adaptörler çağıranınkine bağlı; onunla birlikte kapansın.
        for delegate in list((self.__dict__.get("_ntt_delegates") or {}).values()):
            try:
                delegate.close()
            except Exception:
                pass
        return original_close(self)

    send.__wrapped__ = original_send  # type: ignore[attr-defined]
    close.__wrapped__ = original_close  # type: ignore[attr-defined]
    HTTPAdapter.send = send
    HTTPAdapter.close = close
    _global_installed = True
    return True
