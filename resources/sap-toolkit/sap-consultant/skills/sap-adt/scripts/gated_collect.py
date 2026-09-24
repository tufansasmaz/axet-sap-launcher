#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NTT Studio — SAP DEV yazma onayı: bir yazma çağrısı için bilgi toplama.

adt_gated_server.py her onaylı yazmadan önce buradan geçer. Paket SAP'tan okunur
(TADIR), ajanın beyanından değil; transport motorun çözeceği sırayla çözülür
(argüman → nesnenin açık transport'u → oturuma sabitlenmiş transport) ve
çözülen değer motora argüman olarak geçirilir: pencerede görünen ile yazılan
aynı olsun.

Yalnızca okur: TADIR/TFDIR SELECT'leri, transport listesi, aktif kaynak.
Okunamayan bilgi onaysız geçmez: CollectError fırlatılır, çağrı reddedilir.
`sap` bir SAPClient (testlerde sahte); SQL'e giren her ad önce süzülür.
"""
from __future__ import annotations

import re
from pathlib import Path

import gated_quality as gq
from object_types import get_adt_type, get_source_url, normalize_object_type

_NAME_RE = re.compile(r"^[A-Z0-9_/$]{1,60}$")
_TR_RE = re.compile(r"^[A-Z0-9]{10}$")
_SCRIPT_RE = re.compile(r"^[A-Za-z0-9_.-]{1,80}$")
_FUGR_RE = re.compile(r"^(/[A-Z0-9_]+/)?SAPL(.+)$")

# Kaynak taşıyan oluşturma araçları → R3TR tipi. Kalite kapısı bunlarda çalışır.
SOURCE_CREATES = {
    "adt_create_cds_view": "DDLS",
    "adt_create_metadata_extension": "DDLX",
    "adt_create_access_control": "DCLS",
    "adt_create_behavior_definition": "BDEF",
    "adt_create_type_group": "TYPE",
}
PLAIN_CREATES = {
    "adt_create_domain": "DOMA",
    "adt_create_data_element": "DTEL",
    "adt_create_table_type": "TTYP",
    "adt_create_function_group": "FUGR",
    "adt_create_service_binding": "SRVB",
    "adt_create_lock_object": "ENQU",
}

MSG_TRANSPORT_BELIRSIZ = (
    "Hangi transport'a yazılacağı belli değil: nesnenin açık bir transport'u yok, oturuma "
    "sabitlenmiş transport yok ve paket yerel değil. Kullanıcıya transport'u sor "
    "(adt_list_transports), sonra transport argümanıyla tekrar çağır."
)


class CollectError(Exception):
    def __init__(self, reason: str, message: str):
        super().__init__(message)
        self.reason = reason
        self.message = message


def _name(value, field: str) -> str:
    v = str(value or "").strip().upper()
    if not _NAME_RE.match(v):
        raise CollectError("gecersiz_ad", f"{field} geçersiz: {value!r}")
    return v


def _tr(value) -> str:
    v = str(value or "").strip().upper()
    if v and not _TR_RE.match(v):
        raise CollectError("gecersiz_ad", f"transport geçersiz: {value!r}")
    return v


def _local(paket: str) -> bool:
    # '$' ile başlayan paketler yereldir ($TMP, $ZDENEME): transport kaydı yok.
    return paket.startswith("$")


def r3tr(object_type) -> str:
    try:
        return get_adt_type(object_type).split("/")[0].upper()
    except (KeyError, ValueError):
        raise CollectError("bilgi_toplanamadi", f"tanınmayan nesne tipi: {object_type!r}")


def _select_one(sap, query: str) -> str | None:
    try:
        res = sap.run_sql_query(query, max_rows=1)
    except Exception as exc:  # noqa: BLE001 — okunamayan bilgi = ret
        raise CollectError("bilgi_toplanamadi", f"SAP'tan okunamadı: {exc}")
    rows = (res or {}).get("data") or []
    if not rows or not rows[0]:
        return None
    return (rows[0][0] or "").strip() or None


def tadir_devclass(sap, tip: str, ad: str) -> str | None:
    return _select_one(
        sap, f"SELECT devclass FROM tadir WHERE pgmid = 'R3TR' AND object = '{tip}' AND obj_name = '{ad}'")


def fm_group(sap, fm: str) -> str | None:
    pname = _select_one(sap, f"SELECT pname FROM tfdir WHERE funcname = '{fm}'")
    m = _FUGR_RE.match((pname or "").upper())
    return (m.group(1) or "") + m.group(2) if m else None


def package_of(sap, tip: str, ad: str) -> str | None:
    if tip == "FUNC":
        fg = fm_group(sap, ad)
        return tadir_devclass(sap, "FUGR", fg) if fg else None
    return tadir_devclass(sap, tip, ad)


def owner_transport(sap, ad: str, object_type) -> str:
    try:
        return (sap._find_existing_transport(ad, normalize_object_type(object_type), "") or "").upper()
    except Exception:  # noqa: BLE001 — motor da sessizce boşa düşüyor
        return ""


def session_transport(sap) -> str:
    return (getattr(sap, "session_transport", None) or "").upper()


def transport_info(sap, tr: str) -> dict | None:
    if not tr:
        return None
    try:
        info = sap.get_transport_info(tr)
    except Exception:  # noqa: BLE001
        info = None
    if not info:
        return None
    return {"aciklama": str(info.get("description") or ""),
            "sahip": str(info.get("owner") or ""),
            "durum": str(info.get("status") or "")}


def active_source(sap, ad: str, object_type, fg: str | None = None) -> str | None:
    try:
        return sap.adt_client.get_object_source(get_source_url(ad, object_type, fg), version="active")
    except Exception:  # noqa: BLE001
        return None


def _read_source(project_dir, source_file) -> bytes:
    if not source_file:
        raise CollectError("kaynak_dosyasi_gerekli", "source_file gerekli.")
    p = Path(source_file)
    if not p.is_absolute():
        p = Path(project_dir) / p
    if not p.is_file():
        raise CollectError("kaynak_dosyasi_yok", f"kaynak dosyası bulunamadı: {source_file}")
    return p.read_bytes()


def source_object(sap, project_dir, source_file, ad, object_type, tip, paket, yeni, fg=None) -> dict:
    data = _read_source(project_dir, source_file)
    obj = {"ad": ad, "tip": tip, "paket": paket, "yeni": yeni, "kaynak_sha256": [gq.src_hash(data)]}
    if not yeni:
        old = active_source(sap, ad, object_type, fg)
        if old is None:
            obj["fark"], obj["fark_kirpildi"] = "(SAP'taki aktif sürüm okunamadı)", False
        else:
            obj["fark"], obj["fark_kirpildi"] = gq.diff(old, data.decode("utf-8", "replace"))
    return obj


def _resolve(sap, arg, owner: str, paket: str) -> tuple[str, str]:
    """(transport, motora_geçirilecek). Argüman varsa enjekte edilecek bir şey yok."""
    tr = _tr(arg)
    if tr:
        return tr, ""
    tr = owner or session_transport(sap)
    if not tr and not _local(paket):
        raise CollectError("transport_belirsiz", MSG_TRANSPORT_BELIRSIZ)
    return tr, tr


def _result(sap, nesneler, tr, *, paket=None, enjekte="", kalite=False) -> dict:
    out = {"nesneler": nesneler, "transport": tr, "transport_bilgi": transport_info(sap, tr),
           "enjekte_transport": enjekte, "kalite": kalite}
    if paket is not None:
        out["paket"] = paket
    return out


def _existing(sap, tip, ad, fallback_paket=""):
    paket = package_of(sap, tip, ad)
    return (paket or fallback_paket), paket is None


def _owner_resolve(sap, ad, ot, arg, paket, yeni) -> tuple[str, str]:
    """Var olan nesnenin sahip transport'unu doğrula ve çöz (push ve CDS create için)."""
    arg_tr = _tr(arg)
    # I1: Argüman transport varsa ve nesne mevcutsa, motorun yazacağı transport'u doğrula
    if arg_tr and not yeni:
        try:
            eng = (sap._find_existing_transport(ad, normalize_object_type(ot), arg_tr) or "").upper()
        except Exception as exc:  # noqa: BLE001
            raise CollectError("bilgi_toplanamadi", f"{ad} için transport doğrulanamadı: {exc}")
        if eng and eng != arg_tr:
            raise CollectError("transport_belirsiz",
                             f"{ad} {eng} transport'unda kayıtlı; motor oraya yazar. transport={eng} ile tekrar dene.")
    owner = "" if yeni else owner_transport(sap, ad, ot)
    return _resolve(sap, arg_tr, owner, paket)


# --- araç başına toplayıcılar ------------------------------------------------
def _push(sap, pd, a):
    ad, ot = _name(a.get("name"), "name"), a.get("object_type")
    tip = r3tr(ot)
    if tip == "FUNC":
        raise CollectError("bilgi_toplanamadi",
                           "Fonksiyon modülü adt_push ile yazılmaz; adt_write_function_module kullan.")
    paket, yeni = _existing(sap, tip, ad)
    tr, enj = _owner_resolve(sap, ad, ot, a.get("transport"), paket, yeni)
    obj = source_object(sap, pd, a.get("source_file"), ad, ot, tip, paket, yeni)
    return _result(sap, [obj], tr, enjekte=enj, kalite=True)


def _write_fm(sap, pd, a):
    ad, fg = _name(a.get("name"), "name"), _name(a.get("function_group"), "function_group")
    paket = tadir_devclass(sap, "FUGR", fg)
    if paket is None:
        raise CollectError("bilgi_toplanamadi", f"Fonksiyon grubu {fg} SAP'ta yok; önce adt_create_function_group.")
    mevcut = fm_group(sap, ad)
    if mevcut and mevcut != fg:
        raise CollectError("bilgi_toplanamadi", f"{ad} SAP'ta {mevcut} grubunda, {fg} değil.")
    tr = _tr(a.get("transport"))
    if not tr and not _local(paket):
        raise CollectError("transport_belirsiz", MSG_TRANSPORT_BELIRSIZ)
    obj = source_object(sap, pd, a.get("source_file"), ad, "function", "FUNC", paket, mevcut is None, fg=fg)
    return _result(sap, [obj], tr, kalite=True)


def _create(sap, pd, a, arac):
    ad, pk = _name(a.get("name"), "name"), _name(a.get("package"), "package")
    if arac in SOURCE_CREATES:
        tip = SOURCE_CREATES[arac]
    elif arac in PLAIN_CREATES:
        tip = PLAIN_CREATES[arac]
    else:  # adt_create, adt_create_ddic_shell
        tip = r3tr(a.get("object_type"))
    paket, yeni = _existing(sap, tip, ad, pk)
    # CDS görünümleri: varsa sahip transport doğrulaması gerekli
    if arac == "adt_create_cds_view":
        tr, enj = _owner_resolve(sap, ad, "cds", a.get("transport"), paket, yeni)
    else:
        tr, enj = _resolve(sap, a.get("transport"), "", paket)
    if arac in SOURCE_CREATES:
        obj = source_object(sap, pd, a.get("source_file"), ad, tip, tip, paket, yeni)
        return _result(sap, [obj], tr, enjekte=enj, kalite=True)
    return _result(sap, [{"ad": ad, "tip": tip, "paket": paket, "yeni": yeni}], tr, enjekte=enj)


def _activate(sap, pd, a):
    items = a.get("objects") or ([{"name": a.get("name"), "object_type": a.get("object_type")}]
                                 if a.get("name") else [])
    if not items or not isinstance(items, list):
        raise CollectError("bilgi_toplanamadi", "name ya da objects gerekli.")
    nesneler, tr = [], ""
    for it in items:
        if not isinstance(it, dict):
            raise CollectError("bilgi_toplanamadi", "objects öğeleri {name, object_type} olmalı.")
        ad, ot = _name(it.get("name"), "name"), it.get("object_type") or "class"
        tip = r3tr(ot)
        paket, yeni = _existing(sap, tip, ad)
        nesneler.append({"ad": ad, "tip": tip, "paket": paket, "yeni": yeni})
        if not tr and not yeni:
            tr = owner_transport(sap, ad, ot)
    return _result(sap, nesneler, tr or session_transport(sap))


def _object_tool(sap, pd, a, *, inject: bool):
    """Tek nesneli HER_SEFER araçları: silme, transport'tan çıkarma, kilit temizleme."""
    ad, ot = _name(a.get("name"), "name"), a.get("object_type") or "class"
    tip = r3tr(ot)
    paket, yeni = _existing(sap, tip, ad)
    tr = _tr(a.get("transport"))
    enj = ""
    if not tr and not yeni:
        tr = owner_transport(sap, ad, ot) or (session_transport(sap) if inject else "")
        enj = tr if inject else ""
    return _result(sap, [{"ad": ad, "tip": tip, "paket": paket, "yeni": yeni}], tr, enjekte=enj)


def _srvb(sap, pd, a):
    ad = _name(a.get("name"), "name")
    paket, yeni = _existing(sap, "SRVB", ad)
    tr = ("" if yeni else owner_transport(sap, ad, "SRVB")) or session_transport(sap)
    return _result(sap, [{"ad": ad, "tip": "SRVB", "paket": paket, "yeni": yeni}], tr)


def _screen(sap, pd, a):
    ad = _name(a.get("program"), "program")
    paket, yeni = _existing(sap, "PROG", ad)
    if yeni:
        raise CollectError("bilgi_toplanamadi", f"{ad} programı SAP'ta yok; ekran var olan programa üretilir.")
    tr, enj = _resolve(sap, a.get("transport"), owner_transport(sap, ad, "program"), paket)
    return _result(sap, [{"ad": ad, "tip": "PROG", "paket": paket, "yeni": yeni}], tr, enjekte=enj)


def _adobe(sap, pd, a):
    pk = _name(a.get("devclass") or "$TMP", "devclass")
    nesneler = []
    for field, tip in (("interface", "SFPI"), ("form", "SFPF")):
        if a.get(field):
            ad = _name(a.get(field), field)
            paket, yeni = _existing(sap, tip, ad, pk)
            nesneler.append({"ad": ad, "tip": tip, "paket": paket, "yeni": yeni})
    if not nesneler:
        raise CollectError("bilgi_toplanamadi", "interface ya da form gerekli.")
    tr = _tr(a.get("transport"))
    if not tr and not _local(pk):
        raise CollectError("transport_belirsiz", MSG_TRANSPORT_BELIRSIZ)
    return _result(sap, nesneler, tr)


def _msag(sap, pd, a):
    ad = _name(a.get("name"), "name")
    pk = _name(a.get("package"), "package") if a.get("package") else ""
    paket, yeni = _existing(sap, "MSAG", ad, pk)
    owner = "" if yeni else owner_transport(sap, ad, "MSAG")
    tr, enj = _resolve(sap, a.get("transport"), owner, paket)
    return _result(sap, [{"ad": ad, "tip": "MSAG", "paket": paket, "yeni": yeni}], tr, enjekte=enj)


def _set_transport(sap, pd, a):
    return _result(sap, [], _tr(a.get("transport")))


def _delete_transport(sap, pd, a):
    return _result(sap, [], _tr(a.get("transport")))


def _create_transport(sap, pd, a):
    pk = _name(a.get("package"), "package") if a.get("package") else ""
    return _result(sap, [], "", paket=pk)


def _create_package(sap, pd, a):
    ad = _name(a.get("name"), "name")
    ust = _name(a.get("super_package"), "super_package") if a.get("super_package") else ""
    return _result(sap, [{"ad": ad, "tip": "DEVC", "paket": ust, "yeni": True}], _tr(a.get("transport")))


_COLLECTORS = {
    "adt_push": _push,
    "adt_write_function_module": _write_fm,
    "adt_activate": _activate,
    "adt_set_transport": _set_transport,
    "adt_delete_object": lambda s, p, a: _object_tool(s, p, a, inject=True),
    "adt_remove_from_transport": lambda s, p, a: _object_tool(s, p, a, inject=False),
    "adt_clear_lock": lambda s, p, a: _object_tool(s, p, a, inject=False),
    "adt_delete_transport": _delete_transport,
    "adt_create_transport": _create_transport,
    "adt_create_package": _create_package,
    "adt_publish_service_binding": _srvb,
    "adt_unpublish_service_binding": _srvb,
    "adt_generate_screen": _screen,
    "adt_generate_adobe": _adobe,
    "adt_message_class": _msag,
}
for _arac in (*SOURCE_CREATES, *PLAIN_CREATES, "adt_create", "adt_create_ddic_shell"):
    _COLLECTORS[_arac] = (lambda arac: lambda s, p, a: _create(s, p, a, arac))(_arac)


def collect(sap, arac: str, args: dict, project_dir) -> dict:
    """Bir yazma çağrısının bilgisi:
    {nesneler, transport, transport_bilgi, enjekte_transport, kalite[, paket]}.
    `kalite` True ise adt_gated_server her nesnede gated_quality.check çalıştırır.
    """
    fn = _COLLECTORS.get(arac)
    if fn is None:
        raise CollectError("bilgi_toplanamadi", f"{arac} için bilgi toplayıcı yok.")
    # Transport SAP'a gidilmeden süzülür: geçersiz argümanla hiçbir okuma yapılmasın.
    _tr(args.get("transport"))
    return fn(sap, project_dir, args)


# --- teslim ve abapGit -------------------------------------------------------
def _zip_nesneler(sap, project_dir, zip_dosyasi, paket) -> tuple[list[dict], str]:
    if not zip_dosyasi:
        raise CollectError("kaynak_dosyasi_gerekli", "zip_dosyasi gerekli.")
    p = Path(zip_dosyasi)
    if not p.is_absolute():
        p = Path(project_dir) / p
    if not p.is_file():
        raise CollectError("kaynak_dosyasi_yok", f"ZIP bulunamadı: {zip_dosyasi}")
    try:
        objs, zip_sha = gq.zip_objects(p)
    except Exception as exc:  # noqa: BLE001 — bozuk ZIP
        raise CollectError("bilgi_toplanamadi", f"ZIP okunamadı: {exc}")
    nesneler = []
    for o in objs:
        ad = _name(o["ad"], "ZIP'teki nesne adı")
        # I3: Nesne tipi doğrulaması - SQL sorgusundan ÖNCE
        tip = o["tip"]
        if not re.fullmatch(r"[A-Z0-9]{4}", tip):
            raise CollectError("gecersiz_ad", f"ZIP'teki nesne tipi geçersiz: {tip!r}")
        sap_paket, yeni = _existing(sap, tip, ad, paket)
        nesneler.append({"ad": ad, "tip": tip, "paket": sap_paket, "yeni": yeni,
                         "kaynak_sha256": o["kaynak_sha256"]})
    return nesneler, zip_sha


def collect_teslim(sap, project_dir, nesneler, paket, transport, yontem, zip_dosyasi="") -> dict:
    """axet_teslim: yerel modda biten işin tamamı, tek pencere."""
    if yontem not in ("adt", "abapgit"):
        raise CollectError("bilgi_toplanamadi", "yontem 'adt' ya da 'abapgit' olmalı.")
    pk = _name(paket, "paket")
    tr = _tr(transport)
    if not tr and not _local(pk):
        raise CollectError("transport_belirsiz", MSG_TRANSPORT_BELIRSIZ)
    if yontem == "abapgit":
        objs, zip_sha = _zip_nesneler(sap, project_dir, zip_dosyasi, pk)
        out = _result(sap, objs, tr, paket=pk, kalite=True)
        out["teslim"] = {"yontem": "abapgit", "zip_sha256": zip_sha}
        return out
    if not isinstance(nesneler, list) or not nesneler:
        raise CollectError("bilgi_toplanamadi", "nesneler boş olamaz.")
    objs = []
    for o in nesneler:
        if not isinstance(o, dict):
            raise CollectError("bilgi_toplanamadi", "nesneler öğeleri {ad, tip, kaynak_dosyasi?} olmalı.")
        ad, ot = _name(o.get("ad"), "ad"), o.get("tip")
        tip = r3tr(ot)
        sap_paket, yeni = _existing(sap, tip, ad, pk)
        if o.get("kaynak_dosyasi"):
            fg = fm_group(sap, ad) if tip == "FUNC" and not yeni else None
            objs.append(source_object(sap, project_dir, o["kaynak_dosyasi"], ad, ot, tip, sap_paket, yeni, fg=fg))
        else:
            objs.append({"ad": ad, "tip": tip, "paket": sap_paket, "yeni": yeni})
    out = _result(sap, objs, tr, paket=pk, kalite=True)
    out["teslim"] = {"yontem": "adt"}
    return out


def collect_abapgit(sap, project_dir, script, paket="", transport="", zip_dosyasi="") -> dict:
    """axet_abapgit_onay: tier_gate.require_write_approval'ın sorduğu script çalıştırması."""
    s = str(script or "").strip()
    if not _SCRIPT_RE.match(s):
        raise CollectError("gecersiz_ad", f"script geçersiz: {script!r}")
    pk = _name(paket, "paket") if paket else ""
    tr = _tr(transport)
    abapgit = {"script": s}
    if pk:
        abapgit["paket"] = pk
    objs = []
    if zip_dosyasi:
        objs, abapgit["zip_sha256"] = _zip_nesneler(sap, project_dir, zip_dosyasi, pk)
    # I2: Paket varsa ya da ZIP varsa, yerel olmayan paket transport ister
    if (pk or zip_dosyasi) and not tr and not _local(pk):
        raise CollectError("transport_belirsiz", MSG_TRANSPORT_BELIRSIZ)
    out = _result(sap, objs, tr, paket=pk, kalite=bool(zip_dosyasi))
    out["abapgit"] = abapgit
    return out
