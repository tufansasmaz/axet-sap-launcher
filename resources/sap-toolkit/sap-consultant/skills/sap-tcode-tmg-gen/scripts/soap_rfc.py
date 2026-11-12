#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""soap_rfc.py - call a Remote-Enabled generator FM over SOAP-RFC (/sap/bc/soap/rfc).

NTT Studio uyarlaması (2026-11-12). Yukarı akışta bu dosya `.conn_adt`'teki parolayla
SAP'a kendisi gidiyordu: ne kademe kapısı ne onay penceresi bu yolu görüyordu. Burada
parola HİÇ okunmuyor. Çağrı NTT Studio'nun onaylı ADT sunucusuna (`$ABAP_HTTP_URL`,
yoksa http://127.0.0.1:8787; jeton `$ABAP_HTTP_TOKEN`) `axet_rfc_uret` olarak gider;
sunucu paketi/transport'u ve nesneleri pencerede gösterir, kullanıcı onaylarsa RFC'yi
kendi kurulu SAP oturumuyla yapar. Kapılar:

  * KADEME: `.conn_adt`'teki ADT_SAP_TIER (ve varsa ortamdaki NTT_STUDIO_SAP_TIER) DEV
    değilse ya da yoksa SAP'a hiç gidilmez (çıkış 2, `REFUSED [GR_TIER]`).
  * ROL: `axet_rfc_uret` yalnızca onaylı yazma sunucusunda var; NTT Studio onu yalnız
    teknik danışman + DEV'de başlatır. Salt okunur sunucu 404 verir -> çıkış 2.
  * ONAY: her yazma kendi penceresi; bekliyorsa `approval_pending:` + çıkış 3 (kullanıcı
    onaylayınca AYNI komutu tekrar çalıştır), ret ya da hata çıkış 2.

    from soap_rfc import call_rfc
    res = call_rfc(cwd, 'ZND_FM_TCODE_GEN', {'IV_TCODE': 'ZPM_X', ...})
    res -> {'ok': bool, 'http': int, 'fault': str|None, 'out': {TAG: value}}
"""

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

ADT_HTTP_URL = "http://127.0.0.1:8787"
EXIT_REFUSED = 2
EXIT_PENDING = 3
_TIER_ALIASES = {
    "DEVELOPMENT": "DEV", "DEV": "DEV", "SANDBOX": "DEV", "SBX": "DEV",
    "QUALITY": "QA", "QA": "QA", "QAS": "QA", "TEST": "QA",
    "INTEGRATION": "QA", "STAGING": "QA", "TRAINING": "QA",
    "PRODUCTION": "PRD", "PRD": "PRD", "PROD": "PRD", "P": "PRD",
}


def _refuse(code: str, message: str) -> None:
    print(f"REFUSED [{code}]: {message}", file=sys.stderr, flush=True)
    raise SystemExit(EXIT_REFUSED)


def _tier_of(cwd: str | Path) -> str | None:
    """ADT_SAP_TIER, yalnız bu satır okunur (parola satırına bakılmaz)."""
    here = Path(cwd or ".").resolve()
    for d in (here, *here.parents):
        f = d / ".conn_adt"
        if f.is_file():
            for line in f.read_text(encoding="utf-8").splitlines():
                k, sep, v = line.strip().partition("=")
                if sep and k.strip() == "ADT_SAP_TIER" and v.strip():
                    raw = v.strip().upper()
                    return _TIER_ALIASES.get(raw, raw)
            return None
    return None


def require_dev_tier(cwd: str | Path) -> None:
    tier = _tier_of(cwd)
    env = (os.environ.get("NTT_STUDIO_SAP_TIER") or "").strip().upper()
    env = _TIER_ALIASES.get(env, env)
    if tier != "DEV" or (env and env != "DEV"):
        _refuse("GR_TIER", f"sistem kademesi {env or tier or 'bilinmiyor'}: SAP'ta nesne üretmek "
                "yalnız DEV sisteminde yapılır. QA/PRD'ye transport taşır.")


def call_rfc(
    cwd: str | Path, fm_name: str, params: dict[str, Any], timeout: int = 120,
    source_file: str = "",
) -> dict[str, Any]:
    require_dev_tier(cwd)
    token = os.environ.get("ABAP_HTTP_TOKEN", "")
    if not token:
        _refuse("GR_APPROVAL", "approval_unavailable: ABAP_HTTP_TOKEN ortamda yok. NTT Studio'da DEV "
                "sistemine bağlıyken ajan terminalinden çalıştır.")
    base = (os.environ.get("ABAP_HTTP_URL") or "").strip().rstrip("/") or ADT_HTTP_URL
    body = {"fm": fm_name, "params": params,
            "kaynak_dosyasi": str(Path(source_file).resolve()) if source_file else ""}
    req = urllib.request.Request(
        base + "/tool/axet_rfc_uret", data=json.dumps(body).encode("utf-8"), method="POST",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"})
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        with opener.open(req, timeout=timeout + 120) as resp:
            out = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            _refuse("GR_ROLE", "bu sistemde onaylı yazma sunucusu yok (axet_rfc_uret bulunamadı): "
                    "SAP'ta nesne üretmek yalnız teknik danışman rolünde ve DEV sisteminde açık.")
        if exc.code == 401:
            _refuse("GR_APPROVAL", "approval_unavailable: sunucu jetonu kabul etmedi (401).")
        _refuse("GR_APPROVAL", f"approval_unavailable: sunucu HTTP {exc.code} döndü.")
    except Exception as exc:  # noqa: BLE001 — sunucu yoksa yazma yok
        _refuse("GR_APPROVAL", f"approval_unavailable: onaylı sunucuya ulaşılamadı ({type(exc).__name__}).")
    if not isinstance(out, dict):
        _refuse("GR_APPROVAL", "approval_unavailable: sunucunun cevabı anlaşılmadı.")
    if out.get("ok") is True and isinstance(out.get("rfc"), dict):
        return out["rfc"]
    error = str(out.get("error") or "approval_unavailable")
    message = str(out.get("message") or error)
    if error == "approval_pending":
        print(f"approval_pending: {message}", flush=True)
        raise SystemExit(EXIT_PENDING)
    _refuse("GR_TIER" if error == "GR_TIER" else "GR_APPROVAL", f"{error}: {message}")
    return {}  # erişilmez


if __name__ == "__main__":
    for s in (sys.stdout, sys.stderr):
        s.reconfigure(encoding="utf-8", errors="replace")
    print(__doc__)
