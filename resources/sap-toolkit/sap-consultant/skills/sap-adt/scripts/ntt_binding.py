"""NTT Studio: sunucu yalnızca NTT Studio'nun bağladığı SAP sistemiyle konuşur.

Motor (`adt_mcp_server.py` / `sap_adt_lib.py`, satıcı dosyaları) SAP adresini,
client'ı ve kullanıcıyı `.conn_adt`'den okuyor; dosyayı içe aktarılırken ve
ilk SAP çağrısında (`set_explicit_working_dir`) `load_dotenv(override=True)`
ile ortama yeniden yüklüyor. `.conn_adt` ajanın klasöründe, düz metin: ajan
`ADT_SAP_URL`'yi (ya da client/kullanıcıyı) başka bir sisteme çevirirse
NTT Studio'nun onay penceresi launcher'ın bildiği sistemi (ör. "DEV") gösterir,
kullanıcı onu onaylar, yazma başka sisteme gider. Kademe tabanı (ntt_tier.py)
bunu görmez: kademe sistemin değil, launcher'ın yapılandırmasının söylediği.

NTT Studio sunucuyu başlatırken `.conn_adt`'ye yazdığı değerlerin AYNISINI
(tek hesaplama, bkz. app-electron/main/sapBinding.ts) sürecin ortamına
`NTT_STUDIO_SAP_URL`, `NTT_STUDIO_SAP_CLIENT`, `NTT_STUDIO_SAP_USER` olarak
koyuyor. Bu modül:

  * üç değeri (ve `ADT_CWD`'yi) motor İÇE AKTARILMADAN önce bir kez yakalıyor
    (`capture_env_binding`). Sonradan okunsa `.conn_adt`'ye yazılmış aynı adlı
    bir satır override=True ile ortamdaki değeri ezmiş olabilirdi.
  * HER araç çağrısından önce etkin bağlantıyı yakalanan değerle
    karşılaştırıyor (`check`): `.conn_adt`'nin o anki içeriği (hem `ADT_CWD`
    altındaki hem motorun o an bulacağı dosya), `os.environ`, motorun modül
    değişkenleri ve kurulmuşsa canlı oturumun kendisi. Tek bir fark çağrıyı
    motora gitmeden reddettiriyor (`install`).

Okuma araçları da dahil: onay penceresine giden transport/paket bilgisi okuma
araçlarıyla toplanıyor; başka sistemden okunan bilgiyle doğru sistem adına
onay istenmesin.

Ortamda URL YOKSA (sunucuyu NTT Studio değil biri elle başlatmışsa) hiçbir şey
değişmiyor: o sürecin ortamı zaten başlatanın elinde, ondan gelen bir değer
güvenilir kaynak olmazdı. Sunucu bunu stderr'e uyarı olarak yazıyor.

Parola hiçbir yerde karşılaştırılmıyor, okunmuyor, yazılmıyor: aynı adres +
client + kullanıcı aynı sistemdeki aynı hesap demek; parola ortama da konmuyor.

Kullanım (sarmalayıcı sunucular):
    import ntt_binding
    _ENV_BINDING = ntt_binding.capture_env_binding()   # motor içe aktarılmadan ÖNCE
    import adt_mcp_server as engine
    import sap_adt_lib
    ...
    ntt_binding.install(engine, names, _ENV_BINDING, lib=sap_adt_lib,
                        live_client=lambda: engine._client,
                        ensure_client=engine._get_client, on_mismatch=...)
"""

from __future__ import annotations

import functools
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable, Mapping, Optional
from urllib.parse import urlsplit

ENV_URL = "NTT_STUDIO_SAP_URL"
ENV_CLIENT = "NTT_STUDIO_SAP_CLIENT"
ENV_USER = "NTT_STUDIO_SAP_USER"
ENV_CWD = "ADT_CWD"

# Motorun `.conn_adt`'de ve ortamda okuduğu anahtarlar.
CONN_KEYS = {"url": "ADT_SAP_URL", "client": "ADT_SAP_CLIENT", "kullanici": "ADT_SAP_USER"}

_DEFAULT_PORTS = {"http": 80, "https": 443}

# `_read_conn` sonucunda iki ayrıştırıcının ayrıştığı alanlar. Dizgi değil: dosyadaki
# hiçbir anahtar onunla çakışamaz.
_AYRISMA = object()

MESSAGE = ("Etkin SAP bağlantısı NTT Studio'nun bağladığı sistemden farklı ({alanlar}; "
           "kaynak: {kaynak}). Çağrı SAP'a gönderilmedi. `.conn_adt`'yi düzenlemek yerine "
           "NTT Studio'dan sisteme yeniden bağlan; başka bir sistemde çalışmak için o "
           "sisteme NTT Studio'dan bağlan.")


@dataclass(frozen=True)
class Binding:
    """NTT Studio'nun beklediği bağlantı; alanlar karşılaştırma için normalleştirilmiş."""
    url: str
    client: str
    user: str
    cwd: Optional[str]


def normalize_url(raw: Optional[str]) -> Optional[str]:
    """`şema://host:port` biçimi; yol, sorgu ve sondaki `/` yok sayılır.

    Şema ve host küçük harf, varsayılan port açık yazılıyor: `https://x` ile
    `https://X:443/` aynı sistem. Kullanıcı bilgisi (`user@host`) korunuyor ki
    adrese gömülmüş başka bir kimlik farklı sayılsın. Ayrıştırılamayan ya da
    şeması/hostu olmayan değer için None.
    """
    if raw is None:
        return None
    text = str(raw).strip()
    if not text:
        return None
    try:
        parts = urlsplit(text)
        scheme = (parts.scheme or "").lower()
        host = (parts.hostname or "").lower()
        port = parts.port
    except ValueError:
        return None
    if not scheme or not host:
        return None
    if port is None:
        port = _DEFAULT_PORTS.get(scheme)
    userinfo = ""
    if "@" in parts.netloc:
        userinfo = parts.netloc.rsplit("@", 1)[0] + "@"
    if ":" in host:
        host = f"[{host}]"  # IPv6: köşeli parantez portla karışmasın
    return f"{scheme}://{userinfo}{host}" + (f":{port}" if port is not None else "")


def _norm_url_or_raw(raw: Optional[str]) -> str:
    # Ayrıştırılamayan değer yine de karşılaştırılıyor: aynı bozuk metin
    # eşleşir, farklı olan eşleşmez. None'a düşürmek iki farklı bozuk adresi
    # "eşit" sayardı.
    text = (raw or "").strip()
    return normalize_url(text) or text.lower()


def _norm_text(raw: Optional[str]) -> str:
    return (raw or "").strip().casefold()


def _norm_cwd(raw: Optional[str]) -> str:
    text = (raw or "").strip()
    if not text:
        return ""
    try:
        return os.path.normcase(str(Path(text).resolve()))
    except (OSError, ValueError):
        return os.path.normcase(text)


def capture_env_binding(environ: Optional[Mapping[str, str]] = None) -> Optional[Binding]:
    """Ortamdaki beklenen bağlantı; URL yoksa None (NTT Studio dışında başlatılmış)."""
    env = os.environ if environ is None else environ
    url = (env.get(ENV_URL) or "").strip()
    if not url:
        return None
    cwd = (env.get(ENV_CWD) or "").strip() or None
    return Binding(url=_norm_url_or_raw(url), client=_norm_text(env.get(ENV_CLIENT)),
                   user=_norm_text(env.get(ENV_USER)), cwd=_norm_cwd(cwd) if cwd else None)


def parse_conn(text: str) -> dict:
    """`.conn_adt`'nin basit okuması; motorun kullandığı dotenv biçimini tolere eder.

    Yorum ve boş satırlar atlanır, `export ` öneki kabul edilir, değerin
    etrafındaki tek/çift tırnak soyulur, tırnaksız değerde ` #` sonrası yorum
    sayılır. Aynı anahtar iki kez yazılmışsa sonuncusu geçerli: dotenv de
    sırayla yükleyip sonuncuyu bırakıyor.
    """
    out: dict = {}
    for line in text.splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        if s.startswith("export "):
            s = s[len("export "):].lstrip()
        if "=" not in s:
            continue
        key, value = s.split("=", 1)
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
            value = value[1:-1]
        else:
            hash_at = value.find(" #")
            if hash_at >= 0:
                value = value[:hash_at].rstrip()
        out[key] = value
    return out


def _conn_path_for(cwd: Optional[str]) -> Path:
    return (Path(cwd) if cwd else Path.cwd()) / ".conn_adt"


def _engine_view(path: Path) -> Optional[dict]:
    """Dosyanın motorun gördüğü hali: motorun kendi ayrıştırıcısı (python-dotenv).

    Motor `.conn_adt`'yi `load_dotenv` ile yüklüyor; dotenv çift tırnaklı bir
    değeri satırlara yayabiliyor, `${VAR}` genişletiyor. Satır satır bir okuma
    tırnağın içindeki `ADT_SAP_URL=...` satırını atama sayar, dotenv saymaz:
    denetim DEV'i görürken motor başka sisteme bağlanır (R2 Y-1). Denetimin
    motorla aynı ayrıştırıcıyı kullanması bu ayrışmanın ta kendisini kapatıyor.
    dotenv yoksa motor da yüklenemiyor; None.
    """
    try:
        from dotenv import dotenv_values
    except ImportError:
        return None
    try:
        return dict(dotenv_values(dotenv_path=path))
    except Exception:  # noqa: BLE001 — okunamayan dosya çağıranda eksik sayılıyor
        return None


def _read_conn(path: Path) -> Optional[dict]:
    """Motorun göreceği değerler; iki ayrıştırıcı bağlantı anahtarlarında
    ayrışıyorsa `_AYRISMA` anahtarında hangi alanlar olduğu.

    Ayrışma, hangi ayrıştırıcı haklı olursa olsun ret sebebi: NTT Studio'nun
    yazdığı dosya düz `ANAHTAR=değer` satırları; iki okumanın farklı sonuç
    verdiği bir dosyayı ancak biri özellikle öyle yazmış olabilir.
    """
    try:
        text = path.read_text(encoding="utf-8-sig", errors="replace")
    except OSError:
        return None
    simple = parse_conn(text)
    engine = _engine_view(path)
    if engine is None:
        return simple
    ayrisma = [name for name, key in CONN_KEYS.items() if simple.get(key) != engine.get(key)]
    if ayrisma:
        engine = dict(engine)
        engine[_AYRISMA] = ayrisma
    return engine


def _diff(binding: Binding, url: Optional[str], client: Optional[str], user: Optional[str],
          missing_is_mismatch: bool) -> list:
    """Farklı alanların adları. Değeri None olan alan `missing_is_mismatch`'e göre."""
    fields = []
    for name, got, want, norm in (("url", url, binding.url, _norm_url_or_raw),
                                  ("client", client, binding.client, _norm_text),
                                  ("kullanici", user, binding.user, _norm_text)):
        if got is None:
            # client boş beklenen bir sistemde (BTP) satırın hiç olmaması doğru.
            if missing_is_mismatch and not (name == "client" and want == ""):
                fields.append(name)
            continue
        if norm(got) != want:
            fields.append(name)
    return fields


def _display_url(raw: Optional[str]) -> Optional[str]:
    # Mesaja/günlüğe yalnızca normalleştirilmiş adres gidiyor: adrese gömülü
    # bir parola (`https://u:p@host`) olduğu gibi yazılmasın.
    norm = normalize_url(raw)
    if norm is None:
        return None if raw is None else "<ayrıştırılamadı>"
    if "@" in norm:
        scheme, rest = norm.split("://", 1)
        return f"{scheme}://<kimlik>@{rest.rsplit('@', 1)[1]}"
    return norm


def check(binding: Optional[Binding], environ: Optional[Mapping[str, str]] = None,
          lib=None, live_client: Optional[Callable[[], object]] = None) -> Optional[dict]:
    """Uyuşmazlık yoksa None; varsa ne, nerede farklı (parola hiç okunmaz).

    Bakılan kaynaklar, motorun SAP'a gitmek için kullanabileceği her yer:
      * `ADT_CWD`: `.conn_adt` içindeki bir `ADT_CWD=` satırı override=True ile
        ortama girer ve motoru (ör. adt_doctor) başka klasörün dosyasına çevirir.
      * `ADT_CWD` altındaki `.conn_adt` — yoksa ya da anahtar eksikse RED:
        motor dosyayı bulamazsa başka klasörlerde arıyor. Motorun
        ayrıştırıcısıyla okunuyor; basit okumayla ayrışan alan da RED.
      * motorun o an bulacağı `.conn_adt` (`lib.find_conn_file()`), farklıysa.
      * `os.environ` ve motorun modül değişkenleri (`lib.ADT_SAP_URL` ...): yeni
        oturumlar bunlardan kuruluyor. Eksik değer burada fark sayılmıyor.
      * kurulmuşsa canlı oturum (`live_client().adt_client`): motor oturumu bir
        kez kurup süreç boyunca tutuyor.
    """
    if binding is None:
        return None
    env = os.environ if environ is None else environ
    problems: list = []

    if binding.cwd is not None and _norm_cwd(env.get(ENV_CWD)) != binding.cwd:
        problems.append({"kaynak": "ortam", "alanlar": ["klasor"]})

    paths = [_conn_path_for(binding.cwd)]
    if lib is not None:
        try:
            found = lib.find_conn_file()
        except Exception:  # noqa: BLE001 — bulunamayan dosya aşağıda eksik sayılıyor
            found = None
        if found is not None and all(os.path.normcase(str(Path(found))) !=
                                     os.path.normcase(str(p)) for p in paths):
            paths.append(Path(found))
    for path in paths:
        conn = _read_conn(path)
        if conn is None:
            problems.append({"kaynak": "conn_adt", "alanlar": ["dosya"], "dosya": str(path)})
            continue
        fields = _diff(binding, conn.get(CONN_KEYS["url"]), conn.get(CONN_KEYS["client"]),
                       conn.get(CONN_KEYS["kullanici"]), missing_is_mismatch=True)
        fields = sorted(set(fields) | set(conn.get(_AYRISMA, [])))
        if fields:
            problems.append({"kaynak": "conn_adt", "alanlar": fields, "dosya": str(path),
                             "adres": _display_url(conn.get(CONN_KEYS["url"]))})

    fields = _diff(binding, env.get(CONN_KEYS["url"]), env.get(CONN_KEYS["client"]),
                   env.get(CONN_KEYS["kullanici"]), missing_is_mismatch=False)
    if fields:
        problems.append({"kaynak": "ortam", "alanlar": fields,
                         "adres": _display_url(env.get(CONN_KEYS["url"]))})

    if lib is not None:
        fields = _diff(binding, getattr(lib, "ADT_SAP_URL", None), getattr(lib, "ADT_SAP_CLIENT", None),
                       getattr(lib, "ADT_SAP_USER", None), missing_is_mismatch=False)
        if fields:
            problems.append({"kaynak": "motor", "alanlar": fields,
                             "adres": _display_url(getattr(lib, "ADT_SAP_URL", None))})

    if live_client is not None:
        try:
            adt = getattr(live_client(), "adt_client", None)
        except Exception:  # noqa: BLE001 — oturum yoksa bakılacak bir şey de yok
            adt = None
        if adt is not None:
            fields = _diff(binding, getattr(adt, "url", None), getattr(adt, "client", None),
                           getattr(adt, "user", None), missing_is_mismatch=False)
            if fields:
                problems.append({"kaynak": "oturum", "alanlar": fields,
                                 "adres": _display_url(getattr(adt, "url", None))})

    if not problems:
        return None
    alanlar = sorted({f for p in problems for f in p["alanlar"]})
    kaynaklar = sorted({p["kaynak"] for p in problems})
    return {"alanlar": alanlar, "kaynaklar": kaynaklar, "ayrinti": problems,
            "beklenen_adres": _display_url(binding.url) or binding.url}


def mismatch_result(found: dict) -> dict:
    """Aracın döndüreceği ret yükü (HTTP 200, `ok: False` — motorun hata biçimi)."""
    return {"ok": False, "error": "binding_mismatch",
            "message": MESSAGE.format(alanlar=", ".join(found["alanlar"]),
                                      kaynak=", ".join(found["kaynaklar"])),
            "alanlar": found["alanlar"], "kaynaklar": found["kaynaklar"],
            "ayrinti": found["ayrinti"], "beklenen_adres": found["beklenen_adres"]}


def wrap(name: str, orig: Callable, binding: Binding, *, environ=None, lib=None,
         live_client=None, ensure_client: Optional[Callable[[], object]] = None,
         on_mismatch: Optional[Callable[[str, dict], None]] = None) -> Callable:
    """`orig`'i, önce bağlantıyı denetleyen bir işlevle sar (imza korunur).

    `ensure_client` (motorun `_get_client`'ı) denetimden ÖNCE çağrılıyor. Motor
    oturumu ilk SAP çağrısında kuruyor ve kurarken `.conn_adt`'yi override=True
    ile yeniden yüklüyor; kurulum denetimden sonra kalsa ilk çağrı denetimin
    hiç görmediği değerlerle SAP'a giderdi (R2 Y-1). Önce kurunca canlı oturum
    her çağrıda karşılaştırılıyor. Kurucu ağa çıkmıyor (yalnızca istemci
    nesnesi); kurulamazsa denetim yine yapılıyor, motor kendi hatasını veriyor.
    """

    @functools.wraps(orig)
    def guarded(**kwargs):
        if ensure_client is not None:
            try:
                ensure_client()
            except Exception:  # noqa: BLE001 — kurulum hatası denetimi kırmasın
                pass
        found = check(binding, environ=environ, lib=lib, live_client=live_client)
        if found is not None:
            if on_mismatch is not None:
                try:
                    on_mismatch(name, found)
                except Exception:  # noqa: BLE001 — bildirim hatası reddi açmasın
                    pass
            return mismatch_result(found)
        return orig(**kwargs)

    guarded.__ntt_binding__ = binding  # type: ignore[attr-defined]
    return guarded


def install(engine_mod, names: Iterable[str], binding: Optional[Binding], **kwargs) -> int:
    """Her adın modül global'ini EN DIŞ katman olarak sar; sarılan araç sayısı.

    HTTP katmanı aracı `getattr(engine, ad)` ile bulduğu için bu, HTTP'den gelen
    her çağrıyı denetimden geçiriyor. En dışta olması şart: onaylı sunucunun
    sarmalayıcısı launcher'a sormadan önce SAP'tan bilgi topluyor; denetim
    onun içinde kalsa o toplama başka sistemde yapılırdı. Bağlantı yakalanmamışsa
    dokunmaz, 0 döner.
    """
    if binding is None:
        return 0
    count = 0
    for name in names:
        orig = getattr(engine_mod, name, None)
        if not callable(orig) or getattr(orig, "__ntt_binding__", None) is not None:
            continue
        setattr(engine_mod, name, wrap(name, orig, binding, **kwargs))
        count += 1
    return count
