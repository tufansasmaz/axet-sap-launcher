#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Basic Auth kimlik bilgilerini baytlara cevirir. Varsayilan: UTF-8.

NTT Studio uyarlamasi (yukari akista yok) -- 2026-09-23.

Neden var: bu modulden ONCE motor `auth_string.encode('ascii')` yapiyordu.
ASCII disi bir sifrede baglanmak soyle dursun, `UnicodeEncodeError` ile
patliyordu. Asil duzeltme bu.

KOD SAYFASI TAHMINI YOK -- olculdu ve curutuldu. 2026-09-23, bir musteri DEV
sisteminde (client 100): sifre Turkce harf iceriyor ve SAP GUI onunla GIRIYOR:

    /sap/public/ping  kimliksiz              -> 200   (sistem/ag/TLS saglam)
    /sap/bc/ping      UTF-8 baytlariyla      -> 401
    /sap/bc/ping      ISO-8859-9 baytlariyla -> 401

Kullanicinin kilitli OLMADIGI ayrica dogrulandi (olcumlerden sonra GUI hala
giriyor). Yani SAP bu sifreyi GUI'de kabul edip HTTP/ADT kanalinda reddediyor
ve sebep kod sayfasi DEGIL -- baska bir kodlama secmek sorunu cozmuyor.

Hipotez suydu: SAP'in challenge'i `charset="UTF-8"` tasimiyor, RFC 7617'ye gore
bu "kimlik bilgilerini ISO-8859-1 ile kodla" demek, GUI de kendi kod sayfasini
(Turkce 1610 = ISO-8859-9) kullaniyor. Kod bir sure ISO-8859-9 gonderdi; olcum
onu da 401 ile reddetti. Olcumun desteklemedigi bir bayt donusumu, hic
olmamasindan kotudur: gonderileni kimsenin ongoremedigi hale getirir.

Kalan davranis: her zaman UTF-8. `.conn_adt`'taki `ADT_SAP_PW_CHARSET=` satiri
bunu ELLE degistirebiliyor -- olcumle gerekcelenmis bir sistem cikarsa diye
birakilan kapi. Launcher (`app-electron/main/basicAuth.ts`) da UTF-8 gonderiyor;
iki taraf ayni baytlari uretmek zorunda, aksi halde "uygulama baglandi, ajan 401
aldi" hali cikar.
"""
import base64
import os

DEFAULT_CHARSET = "utf-8"


def resolve_credential_charset() -> str:
    """Kullanilacak kod sayfasi: `.conn_adt`'taki satir varsa O, yoksa UTF-8."""
    declared = (os.getenv("ADT_SAP_PW_CHARSET") or "").strip().lower()
    return declared or DEFAULT_CHARSET


def encode_basic_credentials(user: str, password: str) -> str:
    """`base64(user:password)` -- Authorization: Basic <bu deger>."""
    credentials = f"{user}:{password}"
    charset = resolve_credential_charset()
    try:
        raw = credentials.encode(charset)
    except (UnicodeEncodeError, LookupError) as exc:
        # Sessizce kirpmak ya da baska bir kodlamaya dusmek YANLIS sifre
        # gondermek demek -- SAP bunu "hatali giris" sayar ve kilit sayaci
        # (login/fails_to_user_lock, genelde 5) isler.
        raise ValueError(
            f"Sifre '{charset}' kod sayfasinda tasinamiyor ({exc}). "
            ".conn_adt'taki ADT_SAP_PW_CHARSET satirini duzeltin ya da "
            "sifreyi SAP GUI'nin kendi degistirme ekranindan yalnizca ASCII "
            "karakterlerden olusan bir sey ile degistirin."
        ) from exc
    return base64.b64encode(raw).decode("ascii")
