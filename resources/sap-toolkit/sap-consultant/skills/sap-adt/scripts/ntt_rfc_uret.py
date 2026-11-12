# -*- coding: utf-8 -*-
"""NTT Studio — RFC üreteçleri (SOAP-RFC) için onaylı yazma yolu. Yukarı akışta yok.

`sap-tcode-tmg-gen` ve `sap-badi-impl-gen` SAP'ta nesne yaratıyor (SE93 işlem kodu,
SM30 bakım diyaloğu, tablo test verisi, BAdI/ENHO implementasyonu) ama ADT üzerinden
değil: Remote-Enabled bir üreteç FM'ini `/sap/bc/soap/rfc` ile çağırıyorlar. Yukarı
akışta betik `.conn_adt`'teki parolayla SAP'a kendisi gidiyordu; ne kademe kapısı ne
onay penceresi bu yolu görüyordu.

Bu modül o çağrının SAP'a dokunmayan yarısı: hangi FM'e izin var, çağrı hangi nesneyi
hangi pakete/transport'a yazacak (pencerede gösterilecek bilgi), SOAP zarfı ve cevabı.
Çağrının kendisi `adt_gated_server.axet_rfc_uret` içinde, motorun kurulu oturumuyla
(kimlik, TLS sabitlemesi, bağlantı denetimi) ve onaydan SONRA yapılır. Betik tarafı
(`<skill>/scripts/soap_rfc.py`) parola okumuyor, yalnızca bu araca soruyor.

Paket ASLA tahmin edilmez: çağrıda yoksa ya da çağrının kendi içinde çelişiyorsa ret.
"""
from __future__ import annotations

import re
from html import unescape
from xml.sax.saxutils import escape

RFC_NS = "urn:sap-com:document:sap:rfc:functions"
GENERATOR_FUGR = "ZND_FG_AUTO_GEN"

# FM -> (skill klasörü, açıklama, yalnız okur mu)
FMS = {
    "ZND_FM_TCODE_GEN": ("sap-tcode-tmg-gen", "Transaction code generator (RFC)", False),
    "ZND_FM_TMG_GEN": ("sap-tcode-tmg-gen", "Table maintenance generator (RFC)", False),
    "ZND_FM_TABLE_SEED": ("sap-tcode-tmg-gen", "Customizing table test rows (RFC)", False),
    "ZND_FM_DYNPRO_DUMP": ("sap-tcode-tmg-gen", "Dynpro field dump (RFC, read-only)", True),
    "ZND_FM_BADI_IMPL_GEN": ("sap-badi-impl-gen", "BAdI / enhancement implementation generator (RFC)", False),
}

_NAME_RE = re.compile(r"^[A-Z0-9_]{1,40}$")
_TR_RE = re.compile(r"^[A-Z0-9]{10}$")
_PARAM_RE = re.compile(r"^[A-Z][A-Z0-9_]{0,29}$")


class PlanError(Exception):
    def __init__(self, reason: str, message: str):
        super().__init__(message)
        self.reason = reason
        self.message = message


def _s(params: dict, key: str) -> str:
    v = params.get(key)
    return "" if v is None else str(v)


def _customer(name: str, what: str) -> str:
    n = (name or "").strip().upper()
    if not n:
        raise PlanError("bilgi_eksik", f"{what} adı yok.")
    if not _NAME_RE.match(n):
        raise PlanError("gecersiz_ad", f"{what} adı geçersiz: {name!r}")
    if n[0] not in "ZY":
        raise PlanError("musteri_ad_alani",
                        f"{what} {n} müşteri ad alanında değil (Z/Y). Standart nesneye yazılmaz.")
    return n


def _package(raw: str) -> str:
    p = (raw or "").strip().upper()
    if not p:
        raise PlanError("paket_gerekli",
                        "Paket verilmedi. Paketi kullanıcıya SOR (adt_list_package); tahmin etme.")
    if not re.match(r"^\$?[A-Z0-9_/]{1,30}$", p):
        raise PlanError("gecersiz_ad", f"paket adı geçersiz: {raw!r}")
    return p


def _transport(raw: str, paket: str | None) -> str:
    tr = (raw or "").strip().upper()
    if tr and not _TR_RE.match(tr):
        raise PlanError("gecersiz_ad", f"transport numarası geçersiz: {raw!r}")
    if not tr and paket is not None and not paket.startswith("$"):
        raise PlanError("transport_belirsiz",
                        f"{paket} paketi transport'a bağlı ama transport verilmedi. Kullanıcıya "
                        "SOR (adt_list_transports), sonra --transport ile tekrar çalıştır.")
    return tr


def _one(values: set, what: str) -> str | None:
    if len(values) > 1:
        raise PlanError("paket_uyusmazligi",
                        f"Çağrı birden fazla {what} içeriyor: {', '.join(sorted(values))}.")
    return next(iter(values)) if values else None


def plan(fm: str, params: dict) -> dict:
    """Bu çağrının penceresi: {islem, nesneler[{ad, tip}], paket|None, transport}.

    paket None = paket SAP'tan (TADIR) okunacak (var olan nesne); çağrıda verilen paket
    hiçbir zaman başka bir değerle değiştirilmez.
    """
    fm = (fm or "").strip().upper()
    if fm not in FMS:
        raise PlanError("bilinmeyen_uretec",
                        f"{fm or '(boş)'} bu kapıdan çağrılamaz. İzinli: {', '.join(sorted(FMS))}.")
    if not isinstance(params, dict) or not all(isinstance(k, str) and _PARAM_RE.match(k) for k in params):
        raise PlanError("bilgi_eksik", "params {IV_...: değer} biçiminde olmalı.")

    if fm == "ZND_FM_DYNPRO_DUMP":
        return {"islem": "DYNPRO_OKU", "nesneler": [], "paket": None, "transport": ""}

    if fm == "ZND_FM_TCODE_GEN":
        action = _s(params, "IV_ACTION").strip().upper() or "CREATE"
        if action not in ("CREATE", "DELETE"):
            raise PlanError("bilgi_eksik", f"IV_ACTION CREATE ya da DELETE olmalı: {action!r}")
        paket = _package(_s(params, "IV_DEVCLASS"))
        return {"islem": f"TCODE_{action}",
                "nesneler": [{"ad": _customer(_s(params, "IV_TCODE"), "İşlem kodu"), "tip": "TRAN"}],
                "paket": paket, "transport": _transport(_s(params, "IV_TRANSPORT"), paket)}

    if fm == "ZND_FM_TMG_GEN":
        action = _s(params, "IV_ACTION").strip().upper()
        if action not in ("", "RESET"):
            raise PlanError("bilgi_eksik", f"IV_ACTION boş ya da RESET olmalı: {action!r}")
        if _s(params, "IV_DEVCLASS").strip().upper() not in ("", "$TMP"):
            # gen_tmg.py FM'e hep $TMP verir; gerçek paket popup cevaplarında gider.
            raise PlanError("paket_uyusmazligi",
                            "ZND_FM_TMG_GEN'e IV_DEVCLASS=$TMP gider; gerçek paket popup cevaplarında.")
        steps = _s(params, "IV_PRE") + "|" + _s(params, "IV_POST")
        paketler = {m.strip().upper() for m in re.findall(r"KO007-L_DEVCLASS=([^;|]+)", steps)}
        trs = {m.strip().upper() for m in re.findall(r"KO008-TRKORR=([^;|]+)", steps)}
        paket = _one(paketler, "paket")
        if paket is not None:
            paket = _package(paket)
        tr = _one(trs, "transport") or ""
        if action == "" and paket is None:
            raise PlanError("paket_gerekli",
                            "Bakım diyaloğunun paketi popup cevaplarında yok. --package ver; tahmin etme.")
        nesneler = [{"ad": _customer(_s(params, "IV_TABLE"), "Tablo"), "tip": "TOBJ"},
                    {"ad": _customer(_s(params, "IV_FUGR"), "Fonksiyon grubu"), "tip": "FUGR"}]
        return {"islem": "TMG_RESET" if action else "TMG_CREATE", "nesneler": nesneler,
                "paket": paket, "transport": _transport(tr, paket)}

    if fm == "ZND_FM_TABLE_SEED":
        sil = _s(params, "IV_DELETE_FIRST").strip().upper() == "X"
        return {"islem": "TABLO_SIL_DOLDUR" if sil else "TABLO_DOLDUR",
                "nesneler": [{"ad": _customer(_s(params, "IV_TABLE"), "Tablo"), "tip": "TABU"}],
                # Test verisi transport edilmez; paket tablonun kendi paketi (TADIR).
                "paket": None, "transport": ""}

    # ZND_FM_BADI_IMPL_GEN
    kind = _s(params, "IV_KIND").strip().upper()
    paket = _package(_s(params, "IV_DEVCLASS"))
    if kind == "NEW":
        nesneler = [{"ad": _customer(_s(params, "IV_ENHNAME"), "Enhancement implementasyonu"), "tip": "ENHO"}]
    elif kind == "CLASSIC":
        nesneler = [{"ad": _customer(_s(params, "IV_IMPL"), "BAdI implementasyonu"), "tip": "SXCI"}]
    elif kind == "HOOK":
        nesneler = [{"ad": _customer(_s(params, "IV_ENHNAME"), "Enhancement implementasyonu"), "tip": "ENHO"}]
    else:
        raise PlanError("bilgi_eksik", f"IV_KIND NEW, CLASSIC ya da HOOK olmalı: {kind!r}")
    return {"islem": f"BADI_{kind}", "nesneler": nesneler, "paket": paket,
            "transport": _transport(_s(params, "IV_TRANSPORT"), paket)}


def hook_source(data: bytes) -> str:
    """gen_badi_impl.py'nin kaynak dosyasından IV_SOURCE'u kurduğu biçim (aynısı)."""
    return data.decode("utf-8").replace("\r\n", "\n").rstrip("\n")


def envelope(fm: str, params: dict) -> str:
    body = "".join(f"      <{k}>{escape(str(v))}</{k}>\n"
                   for k, v in params.items() if v not in (None, ""))
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<soap-env:Envelope xmlns:soap-env="http://schemas.xmlsoap.org/soap/envelope/" '
            f'xmlns:urn="{RFC_NS}">\n  <soap-env:Header/>\n  <soap-env:Body>\n'
            f"    <urn:{fm}>\n{body}    </urn:{fm}>\n"
            "  </soap-env:Body>\n</soap-env:Envelope>\n")


def parse(fm: str, status: int, text: str) -> dict:
    text = text or ""
    m = (re.search(r"<(?:\w+:)?message>(.*?)</(?:\w+:)?message>", text, re.DOTALL)
         or re.search(r"<(?:\w+:)?faultstring>(.*?)</(?:\w+:)?faultstring>", text, re.DOTALL))
    fault = unescape(m.group(1)).strip() if m else None
    out: dict[str, str] = {}
    resp = re.search(rf"<(?:\w+:)?{fm}\.Response[^>]*>(.*?)</(?:\w+:)?{fm}\.Response>", text, re.DOTALL)
    if resp:
        for tag, val in re.findall(r"<([A-Z0-9_]+)>(.*?)</\1>", resp.group(1), re.DOTALL):
            out[tag] = unescape(val)
    return {"ok": status < 400 and not fault, "http": status, "fault": fault, "out": out}


def post(adt, fm: str, params: dict, timeout: int = 300) -> dict:
    """Zarfı motorun kurulu oturumuyla gönder (kimlik/TLS/sap-client motorunki)."""
    base = adt.url.rstrip("/")
    lang = getattr(adt, "language", None) or "EN"
    url = f"{base}/sap/bc/soap/rfc?sap-client={adt.client}&sap-language={lang}"
    r = adt.session.post(url, data=envelope(fm, params).encode("utf-8"), timeout=timeout,
                         headers={"Content-Type": "text/xml; charset=utf-8", "Accept": "text/xml",
                                  "SOAPAction": '""'})
    return parse(fm, r.status_code, r.text)
