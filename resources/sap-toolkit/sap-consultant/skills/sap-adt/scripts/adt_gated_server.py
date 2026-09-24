#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NTT Studio — SAP DEV yazma onayı: onaylı giriş noktası.

adt_mcp_server.py ile aynı motor, aynı kalıcı oturum, aynı 8787 ve token; ama SAP'a
yazan her araç çağrısı önce NTT Studio'ya (launcher'ın onay ucuna) sorulur.

NE YAPAR
  - Motorun kaydettiği her araç tam olarak bir sınıfta olmalı (SERBEST,
    TRANSPORT_ONAYLI, HER_SEFER, KARMA). Sınıflanmamış ya da kaybolmuş bir araç
    sunucunun BAŞLAMASINI engeller ve adını söyler — adt_readonly_server.py'deki
    drift kontrolünün aynısı.
  - Yazan araçların modül global'leri sarmalayıcıyla değiştirilir. HTTP katmanı
    (engine.run_http → _http_tool_specs) aracı getattr(engine, ad) ile bulduğu için
    HTTP'den gelen her çağrı sarmalayıcıdan geçer.
  - Sarmalayıcı: bilgi toplar (gated_collect), kaynak taşıyan yazmada kalite
    kapısını çalıştırır (gated_quality), launcher'a sorar, yalnızca `izinli`
    cevabında motoru çağırır, sonucu launcher günlüğüne bildirir.
  - Üç araç ekler: axet_teslim, axet_abapgit_onay, axet_inceleme_kaydet.

NEDEN YALNIZCA --http
  stdio MCP yolu araçları kendi kayıt tablosundan çağırır, modül global'lerinden
  değil; sarmalayıcıyı atlardı. Bu yüzden bu sunucu stdio'da çalışmayı reddeder.

KARAR BURADA DEĞİL
  Bu dosya kendi başına izin vermez. Karar mantığı launcher'da (policy.ts);
  launcher'a ulaşılamazsa, cevap anlaşılmazsa ya da ortam değişkenleri yoksa
  sonuç `approval_unavailable`: onay yok, yazma yok.

ÇALIŞTIRMA (launcher başlatır)
  ADT_APPROVAL_URL=http://127.0.0.1:<port> ADT_APPROVAL_TOKEN=<oturum token'ı> \\
  ABAP_HTTP_TOKEN=<8787 token'ı> py adt_gated_server.py --http --port 8787
"""
from __future__ import annotations

import functools
import hashlib
import http.client
import inspect
import json
import os
import re
import sys
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

_SCRIPTS_DIR = Path(__file__).resolve().parent
if str(_SCRIPTS_DIR) in sys.path:
    sys.path.remove(str(_SCRIPTS_DIR))
sys.path.insert(0, str(_SCRIPTS_DIR))


def _read_approval_env() -> tuple[str, str]:
    """Onay ucunun adresi ve token'ı: launcher'ın bu sürecin ortamına koyduğu değerler."""
    return (os.environ.get("ADT_APPROVAL_URL", "").strip().rstrip("/"),
            os.environ.get("ADT_APPROVAL_TOKEN", "").strip())


# Motor içe aktarılmadan ÖNCE, bir kez okunur. sap_adt_lib içe aktarılırken .conn_adt'yi
# ortama yükler, sistem değişiminde override=True ile yeniden yükler: .conn_adt'ye yazılmış
# bir ADT_APPROVAL_* anahtarı onayları sessizce başka bir uca yönlendirmesin.
_APPROVAL = _read_approval_env()

import adt_mcp_server as engine  # noqa: E402
import gated_collect as gc  # noqa: E402
import gated_quality as gq  # noqa: E402


def _assert_origin(mod, expected: Path) -> None:
    """İçe aktarılan modül, bu klasördeki dosya olmalı (aynı adlı başka modül gölgelemesin)."""
    got = getattr(mod, "__file__", None)
    if got is None or Path(got).resolve() != expected.resolve():
        raise SystemExit(
            f"[adt-gated] BAŞLAMIYOR: {mod.__name__!r} {got!r} dosyasından geldi, "
            f"beklenen {expected}. Sarmalanan motor servis edilen motor olmazdı.\n")


_assert_origin(engine, _SCRIPTS_DIR / "adt_mcp_server.py")
_assert_origin(gc, _SCRIPTS_DIR / "gated_collect.py")
_assert_origin(gq, _SCRIPTS_DIR / "gated_quality.py")


# --- sınıflar -----------------------------------------------------------------
SERBEST = {
    "ping", "adt_capabilities", "adt_doctor", "adt_logon", "adt_sql", "adt_list_transports",
    "adt_get_source", "adt_list_package", "adt_where_used", "adt_transport_status",
    "adt_service_binding_status", "adt_transport_check", "adt_check_scatter",
    "adt_syntax_check", "adt_atc_check", "adt_unit_test", "adt_search", "adt_code_search",
    "adt_revisions", "adt_inactive_objects", "adt_badi_discovery", "adt_dumps",
}
TRANSPORT_ONAYLI = {
    "adt_set_transport", "adt_push", "adt_create_domain", "adt_create_data_element",
    "adt_create_cds_view", "adt_create_metadata_extension", "adt_create_access_control",
    "adt_create_behavior_definition", "adt_create_lock_object", "adt_create_type_group",
    "adt_create_table_type", "adt_create_function_group", "adt_write_function_module",
    "adt_create_service_binding", "adt_create_ddic_shell", "adt_create", "adt_activate",
}
HER_SEFER = {
    "adt_clear_lock", "adt_unpublish_service_binding", "adt_publish_service_binding",
    "adt_delete_object", "adt_remove_from_transport", "adt_create_package",
    "adt_create_transport", "adt_delete_transport",
}
S, T_O, H_S = "SERBEST", "TRANSPORT_ONAYLI", "HER_SEFER"
# Mod argümanına göre sınıf. Tanınmayan mod HER_SEFER; eksik/boş mod ayrıca reddedilir.
KARMA = {
    "adt_generate_screen": ("mode", str.upper, {"READ": S, "WRITE": T_O, "DELETE": H_S}),
    "adt_generate_adobe": ("mode", str.upper, {
        "READ": S, "STATUS": S, "GET_PARAMS": S, "GET_LAYOUT": S, "RTTI_DEBUG": S,
        "WRITE": T_O, "SET_LAYOUT": T_O, "SET_PARAMS": T_O, "SYNC_CONTEXT": T_O,
        "DELETE": H_S}),
    "adt_message_class": ("action", str.lower, {"read": S, "create": T_O, "write": T_O}),
}
# Okuma modu da üreteç FM'ini çağırır; FM yoksa motor onu $TMP'ye kurar (bkz. _generator_install).
GENERATOR_TOOLS = ("adt_generate_screen", "adt_generate_adobe")
# Doğru geçildiğinde pencerede ayrıca uyarı olarak gösterilen yıkıcı bayraklar.
DESTRUCTIVE_FLAGS = ("recreate", "replace", "recursive", "remove_locked_objects")
_ISLEM_RE = re.compile(r"^[A-Za-z_]{1,40}$")
# gated_collect._zip_nesneler'in ZIP'teki tipe uyguladığı biçim.
_R3TR_RE = re.compile(r"^[A-Z0-9]{4}$")
AXET_TOOLS = ("axet_teslim", "axet_abapgit_onay", "axet_inceleme_kaydet")
# Kaynağı satır içi taşıyabilen argümanlar: kalite kapısı dosya hash'ine bağlı, bunlar reddedilir.
INLINE_SOURCE_ARGS = ("source", "types_and_constants")
ATC_MAX_OBJECTS = 10
APPROVAL_TIMEOUT_S = 10

MSG_DENIED = "Kullanıcı reddetti. Tekrar deneme, başka yoldan da deneme."
MESAJ = {
    "approval_pending": ("NTT Studio'da onay penceresi açıldı. Kullanıcıya pencereyi onaylamasını "
                         "söyle; onaydan sonra AYNI çağrıyı AYNI argümanlarla tekrar gönder."),
    "approval_denied": MSG_DENIED,
    "yerel_mod": ("Bu oturum 'önce yerelde çalış' modunda: SAP'a doğrudan yazılmaz. İş bitince "
                  "axet_teslim ile tek seferde teslim et."),
    "mod_secilmedi": ("NTT Studio'da bu oturumun çalışma modu seçilmedi. Kullanıcıdan NTT Studio'da "
                      "modu seçmesini iste; seçilmeden SAP'a yazılmaz."),
    "approval_unavailable": ("NTT Studio'nun onay ucuna ulaşılamadı; onay yoksa yazma yok. "
                             "Kullanıcıya NTT Studio'nun açık olduğunu sor. Başka yoldan yazmayı deneme."),
    "mod_belirtilmeli": "Bu araçta mod argümanı açıkça verilmeli (okuma da olsa).",
    "kaynak_dosyasi_gerekli": ("Kaynak satır içi gönderilmez: dosyaya yaz ve source_file ile ver. "
                               "Kalite kapısı dosyanın hash'ini inceleme kaydıyla eşliyor."),
    "inceleme_yok": ("Bu kaynak için inceleme kaydı yok. Önce abap-code-review çalıştır, sonra "
                     "axet_inceleme_kaydet ile kaydet."),
    "inceleme_eski": ("Kaynak incelemeden sonra değişmiş. abap-code-review'u bu kaynakla yeniden "
                      "çalıştır ve axet_inceleme_kaydet ile kaydet."),
    "kritik_bulgu": ("İncelemede kritik bulgu var: kritik bulgular düzeltilmeden SAP'a yazılmaz. "
                     "Aşma yolu yok; düzelt, yeniden incele."),
}


def _registered_names(mcp) -> set:
    return set(mcp._tool_manager._tools)


def _check_classification() -> None:
    sets = {"SERBEST": SERBEST, "TRANSPORT_ONAYLI": TRANSPORT_ONAYLI,
            "HER_SEFER": HER_SEFER, "KARMA": set(KARMA)}
    names = list(sets)
    bad = []
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            both = sets[a] & sets[b]
            if both:
                bad.append(f"    {a} & {b}: {', '.join(sorted(both))}\n")
    if bad:
        raise SystemExit("[adt-gated] BAŞLAMIYOR: bir araç iki sınıfta:\n" + "".join(bad))


def _check_drift(registered: set) -> None:
    classified = SERBEST | TRANSPORT_ONAYLI | HER_SEFER | set(KARMA)
    unknown = sorted(registered - classified)
    missing = sorted(classified - registered)
    if unknown:
        raise SystemExit(
            "[adt-gated] BAŞLAMIYOR: motor bu katmanın sınıflamadığı araç(lar) kaydediyor:\n"
            + "".join(f"    {n}\n" for n in unknown)
            + "  Her birinin okuyup okumadığına bir insan karar verip adt_gated_server.py'deki "
              "sınıflardan birine eklemeli.\n")
    if missing:
        raise SystemExit(
            "[adt-gated] BAŞLAMIYOR: sınıflanan araç(lar) motorda yok (yeniden adlandırılmış "
            "olabilir):\n" + "".join(f"    {n}\n" for n in missing))


def classify(arac: str, raw_kwargs: dict) -> str:
    """Çağrının sınıfı; KARMA araçta ham argümandaki moda göre. 'mod_belirtilmeli' dönebilir."""
    if arac in KARMA:
        param, norm, table = KARMA[arac]
        raw = raw_kwargs.get(param)
        if not isinstance(raw, str) or not raw.strip() or raw != raw.strip():
            return "mod_belirtilmeli"
        return table.get(norm(raw), H_S)
    if arac in HER_SEFER:
        return H_S
    if arac in TRANSPORT_ONAYLI:
        return T_O
    return S


def is_preview(arac: str, args: dict) -> bool:
    """Onaysız geçen, yazmayan çağrılar: önizleme silmeleri ve sabitlemeyi kaldırma.

    Motorun kendi onay koşulundan (force + eşleşen confirm) daha geniş: force ya da
    confirm dolu olan her çağrı pencereye gider, eşleşmese bile.
    """
    if arac == "adt_set_transport":
        return not str(args.get("transport") or "").strip()
    if arac == "adt_delete_object":
        return not (args.get("force") and str(args.get("confirm_name") or "").strip())
    if arac == "adt_delete_transport":
        return not (args.get("force") and str(args.get("confirm_transport") or "").strip())
    return False


def arg_hash(arac: str, args: dict, info: dict) -> str:
    """Kanonik JSON'un SHA-256'sı: argümanlar + pencerede görünen çözülmüş bilgi.

    Launcher onaylanan isteği yalnızca bu hash'le eşler. Bu yüzden çözülen transport,
    paketler ve kaynak hash'leri de içeride: onaydan sonra sabitlenen transport ya da
    düzenlenen kaynak dosyası yeni bir istek olur.
    """
    payload = {
        "arac": arac,
        "args": args,
        "transport": info.get("transport", ""),
        "paket": info.get("paket", ""),
        "nesneler": [[o.get("tip"), o.get("ad"), o.get("paket"), sorted(o.get("kaynak_sha256") or [])]
                     for o in info.get("nesneler", [])],
        "teslim": info.get("teslim"),
        "abapgit": info.get("abapgit"),
    }
    text = json.dumps(payload, sort_keys=True, ensure_ascii=True, separators=(",", ":"), default=str)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


# --- launcher onay ucu ----------------------------------------------------------
class ApprovalUnavailable(Exception):
    pass


_OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def _approval_env() -> tuple[str, str]:
    """Başlangıçta yakalanan değerler; çağrı anındaki os.environ'a bakılmaz."""
    url, token = _APPROVAL
    if not url or not token:
        raise ApprovalUnavailable("ADT_APPROVAL_URL / ADT_APPROVAL_TOKEN yok")
    return url, token


def _launcher(method: str, path: str, body: dict | None = None) -> dict:
    """Onay ucuna tek istek. 200 dışı, ağ hatası ya da JSON olmayan cevap → ApprovalUnavailable."""
    url, token = _approval_env()
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url + path, data=data, method=method, headers={
        "Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    try:
        with _OPENER.open(req, timeout=APPROVAL_TIMEOUT_S) as resp:
            text = resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        raise ApprovalUnavailable(f"onay ucu {exc.code} döndü")
    except (urllib.error.URLError, OSError, http.client.HTTPException, UnicodeDecodeError) as exc:
        raise ApprovalUnavailable(f"onay ucuna ulaşılamadı: {exc}")
    try:
        out = json.loads(text)
    except ValueError:
        raise ApprovalUnavailable("onay ucunun cevabı JSON değil")
    if not isinstance(out, dict):
        raise ApprovalUnavailable("onay ucunun cevabı nesne değil")
    return out


def _post_quiet(path: str, body: dict) -> None:
    """Günlük bildirimi: başarısızlığı yazmayı durdurmaz, stderr'e not düşer."""
    try:
        _launcher("POST", path, body)
    except Exception as exc:  # noqa: BLE001
        sys.stderr.write(f"[adt-gated] günlük bildirimi gitmedi ({path}): {exc}\n")


def _fail(error: str, message: str | None = None, **extra) -> dict:
    return {"ok": False, "error": error, "message": message or MESAJ.get(error, error), **extra}


def ask(fact: dict) -> tuple[dict | None, str | None]:
    """(izin, None) ya da (None, ret yükü). İzin yalnızca karar tam olarak 'izinli' ise."""
    try:
        out = _launcher("POST", "/approvals", fact)
    except ApprovalUnavailable as exc:
        return None, _fail("approval_unavailable", detail=str(exc))
    karar = out.get("karar")
    onay_id = out.get("id")
    mesaj = out.get("mesaj") if isinstance(out.get("mesaj"), str) and out.get("mesaj") else None
    if karar == "izinli" and isinstance(onay_id, str) and onay_id:
        return {"id": onay_id}, None
    if karar == "bekliyor" and isinstance(onay_id, str) and onay_id:
        return None, _fail("approval_pending", mesaj or MESAJ["approval_pending"], approval_id=onay_id)
    if karar in ("reddedildi", "sure_doldu"):
        return None, _fail("approval_denied", MSG_DENIED, karar=karar)
    if karar in ("yerel_mod", "mod_secilmedi"):
        return None, _fail(karar, mesaj or MESAJ[karar])
    return None, _fail("approval_unavailable", detail=f"anlaşılmayan karar: {karar!r}")


# --- bilgi + kalite + karar -----------------------------------------------------
def _sap():
    return engine._get_client()


def _project_dir() -> Path:
    return Path(os.getenv("ADT_CWD") or os.getcwd())


def quality_gate(arac: str, info: dict, pd: Path) -> dict | None:
    """Kaynaklı her nesnede inceleme kaydı kontrolü; ret yükü ya da None. kalite'yi nesneye yazar."""
    if not info.get("kalite"):
        return None
    for o in info["nesneler"]:
        reason, kalite = gq.check(pd, o["tip"], o["ad"], o.get("kaynak_sha256") or [])
        if kalite is not None:
            o["kalite"] = kalite
        if reason:
            _post_quiet("/events", {"tur": "kalite_reddi", "arac": arac,
                                    "nesneler": [{"ad": o["ad"], "tip": o["tip"]}], "sebep": reason})
            return _fail(reason, nesne=f"{o['tip']} {o['ad']}",
                         inceleme_dosyasi=str(gq.review_path(pd, o["tip"], o["ad"])))
    return None


def build_fact(arac: str, sinif: str, args: dict, info: dict) -> dict:
    fact = {
        "arac": arac,
        "sinif": sinif,
        "nesneler": info["nesneler"],
        "transport": info["transport"],
        "transport_bilgi": info["transport_bilgi"],
        "arg_hash": arg_hash(arac, args, info),
    }
    for key in ("paket", "teslim", "abapgit"):
        if info.get(key) is not None:
            fact[key] = info[key]
    # İşlem: KARMA araçta seçilen mod (pencere etiketi buna göre); toplayıcı kendi işlemini
    # verdiyse (üreteç kurulumu) o geçer. Launcher'ın kabul etmeyeceği biçim BILINMEYEN olur.
    islem = info.get("islem")
    if not islem and arac in KARMA:
        param, norm, _table = KARMA[arac]
        raw = args.get(param)
        if isinstance(raw, str) and raw.strip():
            islem = norm(raw.strip())
    if islem:
        fact["islem"] = islem if _ISLEM_RE.match(islem) else "BILINMEYEN"
    # Motor bayrağı doğruluk değerine göre okur; pencere de öyle göstermeli.
    secenekler = {k: True for k in DESTRUCTIVE_FLAGS if args.get(k)}
    if secenekler:
        fact["secenekler"] = secenekler
    return fact


def _atc_summary(name: str, object_type: str) -> dict:
    out = {"nesne": name, "tip": object_type}
    try:
        res = engine.adt_atc_check(name=name, object_type=object_type)
    except Exception as exc:  # noqa: BLE001 — ToolFailure dahil; ATC yazmayı geri almaz
        return {**out, "hata": str(exc)[:200]}
    findings = res.get("findings") or [] if isinstance(res, dict) else []
    counts: dict[str, int] = {}
    for f in findings:
        key = str((f or {}).get("priority", "?"))
        counts[key] = counts.get(key, 0) + 1
    return {**out, "toplam": len(findings), "oncelik": counts}


def run_atc(arac: str, args: dict) -> list | None:
    if arac == "adt_push":
        return [_atc_summary(args["name"], args["object_type"])]
    if arac == "adt_activate":
        items = args.get("objects") or [{"name": args.get("name"), "object_type": args.get("object_type")}]
        if len(items) > ATC_MAX_OBJECTS:
            return None
        return [_atc_summary(it.get("name"), it.get("object_type") or "class") for it in items]
    return None


def _generator_install(arac: str, args: dict) -> tuple[dict | None, dict | None]:
    """(bilgi, ret) — okuma modundaki üreteç çağrısı.

    Üreteç FM TFDIR'da varsa (None, None): okuma serbest. Yoksa motor onu $TMP'ye kurar
    (ZND_FG_AUTO_GEN + FM), yani okuma bir yazmaya dönüşür: kurulum bilgisi döner, çağrı
    HER_SEFER penceresine gider. TFDIR okunamazsa da pencere; serbest geçmez.
    """
    try:
        fm = gc.generator_fm(arac, args)
        if not gc.generator_missing(_sap(), fm):
            return None, None
    except gc.CollectError as exc:
        if exc.reason == "gecersiz_ad":
            return None, _fail(exc.reason, exc.message)
    except Exception:  # noqa: BLE001 — SAP'a bağlanılamadı: denetlenemeyen okuma pencereye
        pass
    return gc.collect_generator(fm), None


def make_wrapper(arac: str, orig):
    sig = inspect.signature(orig)

    @functools.wraps(orig)
    def gated(**kwargs):
        sinif = classify(arac, kwargs)
        if sinif == "mod_belirtilmeli":
            param = KARMA[arac][0]
            return _fail("mod_belirtilmeli", f"{MESAJ['mod_belirtilmeli']} ({param})")
        bound = sig.bind(**kwargs)  # bilinmeyen/eksik argüman: TypeError → HTTP 400 bad_args
        bound.apply_defaults()
        args = dict(bound.arguments)
        info = None
        if sinif == S and arac in GENERATOR_TOOLS:
            info, refused = _generator_install(arac, args)
            if refused:
                return refused
            if info is not None:
                sinif = H_S
        if sinif == S or is_preview(arac, args):
            return orig(**kwargs)
        for key in INLINE_SOURCE_ARGS:
            if str(args.get(key) or "").strip():
                return _fail("kaynak_dosyasi_gerekli")
        pd = _project_dir()
        if info is None:
            try:
                info = gc.collect(_sap(), arac, args, pd)
            except gc.CollectError as exc:
                return _fail(exc.reason, exc.message)
            except Exception as exc:  # noqa: BLE001 — SAP'a bağlanılamadı: bilgi yoksa onay yok
                return _fail("bilgi_toplanamadi", f"SAP'tan bilgi okunamadı: {exc}")
        try:
            refused = quality_gate(arac, info, pd)
        except Exception as exc:  # noqa: BLE001
            return _fail("bilgi_toplanamadi", f"Kalite kapısı okunamadı: {exc}")
        if refused:
            return refused
        grant, refused = ask(build_fact(arac, sinif, args, info))
        if refused:
            return refused
        call = dict(kwargs)
        if "transport" in sig.parameters and not str(args.get("transport") or "").strip() \
                and info.get("enjekte_transport"):
            call["transport"] = info["enjekte_transport"]
        try:
            result = orig(**call)
        except engine.ToolFailure as exc:
            try:
                payload = json.loads(str(exc))
            except ValueError:
                payload = {"ok": False, "error": "tool_failure", "message": str(exc)}
            _post_quiet("/results", {"id": grant["id"], "sap_sonucu": payload})
            raise
        except Exception as exc:
            _post_quiet("/results", {"id": grant["id"], "sap_sonucu": {
                "ok": False, "error": type(exc).__name__, "message": str(exc)}})
            raise
        body = {"id": grant["id"], "sap_sonucu": result if isinstance(result, dict) else {"ok": True}}
        if isinstance(result, dict):
            atc = run_atc(arac, args)
            if atc is not None:
                result["axet_atc"] = atc
                body["atc"] = atc
            corrnr = str(result.get("corrnr") or "").upper()
            transport_approved = str(info["transport"] or "").upper()
            if corrnr and transport_approved and corrnr != transport_approved:
                result["axet_uyari"] = (f"Onaylanan transport {info['transport']}, SAP'ın kaydettiği "
                                        f"{corrnr}. Kullanıcıya söyle.")
        _post_quiet("/results", body)
        return result

    gated._axet_gated = True
    return gated


# --- katmanın kendi araçları -----------------------------------------------------
def _ask_for(arac: str, args: dict, info: dict, pd: Path, *, extra: dict | None = None) -> dict:
    refused = quality_gate(arac, info, pd)
    if refused:
        return refused
    fact = build_fact(arac, T_O, args, info)
    if extra:
        fact.update(extra)
    grant, refused = ask(fact)
    if refused:
        return refused
    return {"ok": True, "onay_id": grant["id"]}


def axet_teslim(nesneler: list | None = None, paket: str = "", transport: str = "",
                yontem: str = "adt", zip_dosyasi: str = "") -> dict:
    """Yerel modda biten işi tek pencerede SAP'a teslim için onay iste. SAP'a YAZMAZ.

    nesneler: [{"ad": "ZCL_X", "tip": "class", "kaynak_dosyasi": "src/zcl_x.clas.abap"}, ...]
    (yontem="adt"); yontem="abapgit" ise zip_dosyasi verilir, nesneler ZIP'ten okunur.
    Her kaynaklı nesnenin abap-code-review kaydı (axet_inceleme_kaydet) güncel olmalı.
    ok:true dönerse aynı nesneleri aynı kaynak dosyalarıyla, aynı transport'a normal
    araçlarla (adt_push, adt_activate ...) yaz; o çağrılar pencere açmadan geçer.
    """
    args = {"nesneler": nesneler, "paket": paket, "transport": transport,
            "yontem": yontem, "zip_dosyasi": zip_dosyasi}
    pd = _project_dir()
    try:
        info = gc.collect_teslim(_sap(), pd, nesneler, paket, transport, yontem, zip_dosyasi)
    except gc.CollectError as exc:
        return _fail(exc.reason, exc.message)
    except Exception as exc:  # noqa: BLE001
        return _fail("bilgi_toplanamadi", f"SAP'tan bilgi okunamadı: {exc}")
    out = _ask_for("axet_teslim", args, info, pd)
    if out.get("ok"):
        out["message"] = ("Teslim onaylandı. Şimdi aynı nesneleri aynı kaynak dosyalarıyla ve aynı "
                          "transport'la yaz; listede olmayan ya da değişmiş kaynak reddedilir.")
    return out


def axet_abapgit_onay(script: str, paket: str = "", transport: str = "",
                      zip_dosyasi: str = "", ust_onay: str = "") -> dict:
    """abapgit-deploy script'lerinin (tier_gate.py) SAP'a yazmadan önce sorduğu onay. SAP'a YAZMAZ."""
    args = {"script": script, "paket": paket, "transport": transport,
            "zip_dosyasi": zip_dosyasi, "ust_onay": ust_onay}
    pd = _project_dir()
    try:
        info = gc.collect_abapgit(_sap(), pd, script, paket, transport, zip_dosyasi)
    except gc.CollectError as exc:
        return _fail(exc.reason, exc.message)
    except Exception as exc:  # noqa: BLE001
        return _fail("bilgi_toplanamadi", f"SAP'tan bilgi okunamadı: {exc}")
    extra = {"ust_onay": ust_onay.strip()} if ust_onay and ust_onay.strip() else None
    return _ask_for("axet_abapgit_onay", args, info, pd, extra=extra)


def axet_inceleme_kaydet(nesne: str, tip: str, kaynak_dosyalari: list, bulgular: dict,
                         rapor: str = "", skill: str = "abap-code-review") -> dict:
    """abap-code-review bittikten sonra inceleme kaydını yaz (.sap-review/<TIP>_<NESNE>.json).

    Hash'leri sunucu kaynak dosyalarından hesaplar; ajan hash yazmaz. bulgular:
    {"kritik": n, "yuksek": n, "orta": n, "dusuk": n}. Kritik > 0 ise kayıt yazılır ama
    o kaynak SAP'a gönderilemez.
    """
    pd = _project_dir()
    try:
        ad = gc._name(nesne, "nesne")
        try:
            r3 = gc.r3tr(tip)
        except gc.CollectError:
            # object_types'ın tanımadığı tipler (ENHO ...) abapGit ZIP'inde ham R3TR tipiyle
            # gelir; kalite kapısı da ZIP'teki tipi kullanır. 4 harfli ham tip kabul.
            r3 = str(tip or "").strip().upper()
            if not _R3TR_RE.match(r3):
                raise
        rec = gq.write_review(pd, ad, r3, kaynak_dosyalari, bulgular, rapor=rapor, skill=skill)
    except gc.CollectError as exc:
        return _fail(exc.reason, exc.message)
    except ValueError as exc:
        return _fail("gecersiz_inceleme", str(exc))
    out = {"ok": True, "kayit": str(gq.review_path(pd, r3, ad)),
           "kaynak_sha256": rec["kaynak_sha256"], "bulgular": rec["bulgular"]}
    if rec["bulgular"]["kritik"] > 0:
        out["message"] = MESAJ["kritik_bulgu"]
    return out


# --- kalp atışı -------------------------------------------------------------------
class Heartbeat:
    """Launcher'ın onay ucunu yoklar; üst üste `max_miss` kaçırmada on_dead çağrılır.

    401 de kaçırmadır: launcher yeniden başladıysa eski token ölüdür ve bu sunucu
    artık hiçbir yazmaya onay alamaz; portu yeni launcher'a bırakmalı.
    """

    def __init__(self, interval: float = 10.0, max_miss: int = 3, on_dead=None):
        self.interval = interval
        self.max_miss = max_miss
        self.on_dead = on_dead or _die
        self.misses = 0
        self._stop = threading.Event()

    def tick(self) -> bool:
        try:
            ok = _launcher("GET", "/health").get("ok") is True
        except Exception:  # noqa: BLE001
            ok = False
        self.misses = 0 if ok else self.misses + 1
        if self.misses >= self.max_miss:
            self.on_dead()
            return False
        return True

    def run(self) -> None:
        while not self._stop.wait(self.interval):
            if not self.tick():
                return

    def start(self) -> threading.Thread:
        t = threading.Thread(target=self.run, name="axet-heartbeat", daemon=True)
        t.start()
        return t

    def stop(self) -> None:
        self._stop.set()


def _die() -> None:
    sys.stderr.write("[adt-gated] NTT Studio'nun onay ucu yanıt vermiyor; süren çağrı bitince "
                     "kapanıyorum.\n")
    sys.stderr.flush()
    # Kilidi alan son çağrı biter; kilidi tuttuğumuz için yenisi başlamaz (503).
    engine._HTTP_CALL_LOCK.acquire(timeout=180)
    os._exit(3)


# --- kurulum ------------------------------------------------------------------------
def build() -> set:
    """Sınıflamayı doğrula, yazan araçları sarmala, axet araçlarını kaydet. Araç kümesini döner."""
    mcp = engine.mcp
    _check_classification()
    _check_drift(_registered_names(mcp))
    for name in sorted(TRANSPORT_ONAYLI | HER_SEFER | set(KARMA)):
        setattr(engine, name, make_wrapper(name, getattr(engine, name)))
    for fn in (axet_teslim, axet_abapgit_onay, axet_inceleme_kaydet):
        setattr(engine, fn.__name__, mcp.tool()(fn))
    return _registered_names(mcp)


def main(argv=None):
    import argparse
    ap = argparse.ArgumentParser(description="NTT Studio — onaylı SAP ADT sunucusu (DEV)")
    ap.add_argument("--http", action="store_true", help="HTTP taşıması (zorunlu)")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8787)
    ap.add_argument("--list-tools", action="store_true",
                    help="Araçları sınıflarıyla yaz ve çık (SAP bağlantısı yok)")
    args = ap.parse_args(argv)
    if not args.http and not args.list_tools:
        raise SystemExit("[adt-gated] BAŞLAMIYOR: yalnızca --http ile çalışır. stdio MCP yolu "
                         "araçları kendi tablosundan çağırır ve onay katmanını atlardı.\n")
    tools = build()
    if args.list_tools:
        for name in sorted(tools):
            sinif = "AXET" if name in AXET_TOOLS else ("KARMA" if name in KARMA else classify(name, {}))
            sys.stdout.write(f"{name}  [{sinif}]\n")
        return
    try:
        _approval_env()
        Heartbeat().start()
    except ApprovalUnavailable:
        sys.stderr.write("[adt-gated] UYARI: ADT_APPROVAL_URL/ADT_APPROVAL_TOKEN yok; her yazma "
                         "approval_unavailable ile reddedilecek.\n")
    sys.stderr.write(f"[adt-gated] onaylı yüzey: {len(tools)} araç "
                     f"({len(TRANSPORT_ONAYLI | HER_SEFER | set(KARMA))} yazan araç onaya bağlı)\n")
    sys.stderr.flush()
    engine.run_http(args.host, args.port)


if __name__ == "__main__":
    main()
