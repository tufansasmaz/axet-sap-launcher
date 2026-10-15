# -*- coding: utf-8 -*-
"""NTT Studio — ad alanlı nesne adresleri (yukarı akışta yok).

Motor nesne adresini adı küçültüp yola koyarak kuruyor:
`/sap/bc/adt/oo/classes/{name.lower()}`. Ad `/ITETR/CL_EHO_BANK_SERVICE`
gibi bir ad alanıyla başlayınca yol `classes//itetr/cl_eho_bank_service`
oluyor; ADT ad alanı eğik çizgilerini `%2f` olarak bekliyor ve bu biçime 404
dönüyor. Arama (`adt_search`) SAP'ın kendi kodlu uri'sini verdiği için
çalışıyor, kaynak okuma (`adt_get_source`) çalışmıyordu (2026-10-15, bir
modül danışmanının müşteri sisteminde: `/ITETR/` sınıflarının hepsi 404,
`CL_GUI_ALV_GRID` sorunsuz).

Adres motorda 30'dan fazla yerde elle kuruluyor; tek bir fonksiyonu sarmak
yetmiyor. Ortak iz şu: ADT yollarında `//` başka hiçbir yerde geçmiyor. Bu
yüzden düzeltme istek katmanında: `SAPADTClient` oturumundan çıkan her
isteğin YOLUNDA `//ns/` → `/%2fns%2f`. Sorgu dizgisine, şemaya ve motor dışı
oturumlara (onay ucu vb.) dokunulmuyor. Motor değişmedi; `ntt_tls_pin` gibi
sınıf düzeyinde `__init__` sarılıyor.
"""
from __future__ import annotations

import re
from urllib.parse import urlsplit, urlunsplit

# `//` + ad alanı + `/`: ad alanı eğik çizgi içermeyen bir parça.
_NAMESPACE = re.compile(r"//([^/]+)/")

_installed = False


def encode_namespaces(url: str) -> str:
    """Yoldaki `//ns/` parçalarını `/%2fns%2f` yapar; gerisine dokunmaz."""
    if "//" not in url:
        return url
    parts = urlsplit(url)
    if "//" not in parts.path:
        return url
    path = _NAMESPACE.sub(lambda m: f"/%2f{m.group(1)}%2f", parts.path)
    return urlunsplit((parts.scheme, parts.netloc, path, parts.query, parts.fragment))


def wrap_session(session) -> None:
    """Oturumun `request`'ini sar; `get`/`post`/`put`/... hepsi ondan geçiyor."""
    if getattr(session.request, "_ntt_ns_url", False):
        return
    original = session.request

    def request(method, url, *args, **kwargs):
        return original(method, encode_namespaces(url) if isinstance(url, str) else url, *args, **kwargs)

    request._ntt_ns_url = True  # type: ignore[attr-defined]
    session.request = request


def install() -> None:
    """`SAPADTClient` her oturum kurduğunda isteklerini sar (sistem değişiminde de)."""
    global _installed
    if _installed:
        return
    import sap_adt_lib

    original = sap_adt_lib.SAPADTClient.__init__

    def __init__(self, *args, **kwargs):
        original(self, *args, **kwargs)
        session = getattr(self, "session", None)
        if session is not None:
            wrap_session(session)

    __init__.__wrapped__ = original  # type: ignore[attr-defined]
    sap_adt_lib.SAPADTClient.__init__ = __init__
    _installed = True
