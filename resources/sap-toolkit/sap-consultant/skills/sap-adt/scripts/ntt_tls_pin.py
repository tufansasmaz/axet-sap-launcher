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
"""

from __future__ import annotations

import os
import re
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

    def __init__(self, fingerprint: str, **kwargs):
        # init_poolmanager, HTTPAdapter.__init__ içinden çağrılıyor; parmak izi
        # ondan ÖNCE hazır olmalı.
        self._ntt_fingerprint = fingerprint
        super().__init__(**kwargs)

    def init_poolmanager(self, connections, maxsize, block=False, **pool_kwargs):
        pool_kwargs["assert_fingerprint"] = self._ntt_fingerprint
        super().init_poolmanager(connections, maxsize, block=block, **pool_kwargs)

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
