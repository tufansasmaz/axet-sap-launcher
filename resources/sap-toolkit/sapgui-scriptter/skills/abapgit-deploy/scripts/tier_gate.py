"""AXET-TIER-GATE: refuse SAP writes unless .conn_adt says ADT_SAP_TIER=DEV.

aXet launcher adaptation (2026-09-23). The abapgit-deploy skill is installed on
every system the technical consultant opens, QA and PRD included; the decision
is that the SKILL is always present and the WRITE is gated at the moment it
happens. These scripts drive SAP GUI directly, so none of the sap-adt engine's
guardrails sit in their path. This module is that gate.

Fails CLOSED, unlike the engine's get_active_tier (which defaults to DEV): no
.conn_adt, or no ADT_SAP_TIER line in it, means the tier is unknown and the
write is refused. The aXet launcher always writes ADT_SAP_TIER when it opens a
system, so a missing line means the folder was not opened through it.

Usage, at the top of a writing script's main():
    from tier_gate import require_dev_tier
    refused = require_dev_tier(cwd)        # cwd: the project folder
    if refused:
        print(refused, file=sys.stderr)
        return 2

NTT Studio — SAP DEV yazma onayı (2026-09-24). DEV kapısından geçen script,
SAP'a dokunmadan önce `require_write_approval` ile 8787'deki onaylı sunucunun
`axet_abapgit_onay` aracına sorar; karar NTT Studio penceresinde verilir:
    from tier_gate import require_dev_tier, require_write_approval
    ...
    rc = require_write_approval(__file__, paket=..., transport=..., zip_dosyasi=...)
    if rc is not None:
        return rc
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

# Same aliases as sap-adt/scripts/guardrails.py _TIER_ALIASES.
_TIER_ALIASES = {
    "DEVELOPMENT": "DEV", "DEV": "DEV", "SANDBOX": "DEV", "SBX": "DEV",
    "QUALITY": "QA", "QA": "QA", "QAS": "QA", "TEST": "QA",
    "INTEGRATION": "QA", "STAGING": "QA", "TRAINING": "QA",
    "PRODUCTION": "PRD", "PRD": "PRD", "PROD": "PRD", "P": "PRD",
}


def find_conn_adt(start: Path | str | None = None) -> Path | None:
    """The nearest .conn_adt at or above `start` (default: the current directory)."""
    here = Path(start or os.getcwd()).resolve()
    for d in (here, *here.parents):
        f = d / ".conn_adt"
        if f.is_file():
            return f
    return None


def read_tier(conn_file: Path) -> str | None:
    """Canonical DEV/QA/PRD from ADT_SAP_TIER, or None when the line is absent."""
    for line in conn_file.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if s.startswith("#") or "=" not in s:
            continue
        k, _, v = s.partition("=")
        if k.strip() == "ADT_SAP_TIER" and v.strip():
            raw = v.strip().upper()
            return _TIER_ALIASES.get(raw, raw)
    return None


def require_dev_tier(start: Path | str | None = None) -> str | None:
    """None when writing is allowed, else the refusal message to print."""
    conn = find_conn_adt(start)
    if conn is None:
        return ("REFUSED [GR_TIER]: no .conn_adt found, so the system tier cannot be "
                "verified. SAP writes are allowed only on a DEV system.")
    try:
        tier = read_tier(conn)
    except Exception as exc:  # unreadable file = unknown tier = refuse
        return (f"REFUSED [GR_TIER]: could not read {conn} ({type(exc).__name__}: {exc}). "
                "SAP writes are allowed only on a DEV system.")
    if tier is None:
        return (f"REFUSED [GR_TIER]: {conn} has no ADT_SAP_TIER line, so the system tier "
                "is unknown. SAP writes are allowed only on a DEV system; open the system "
                "through the aXet launcher and mark it DEV if it is one.")
    if tier != "DEV":
        return (f"REFUSED [GR_TIER]: this system is marked {tier} (read-only). abapGit "
                "deploy/import/activate is allowed only on a DEV system. This is the "
                "intended behaviour, not a fault — deploy on the development system and "
                "let the transport carry it onward.")
    return None


# --- NTT Studio: SAP DEV yazma onayı ------------------------------------------
# Onaylı sunucu (adt_gated_server.py) launcher'ın DEV'de 8787'de başlattığı
# süreç; token ajanın ortamındaki ABAP_HTTP_TOKEN. Launcher'ın onay ucuna buradan
# gidilmez — karar her zaman sunucunun üzerinden, aynı kayıtla verilir.
ADT_HTTP_URL = "http://127.0.0.1:8787"
APPROVAL_ENV = "AXET_ABAPGIT_ONAY_ID"
EXIT_REFUSED = 2
EXIT_PENDING = 3
_TIMEOUT_S = 120


def _refuse(error: str, message: str) -> int:
    print(f"REFUSED [GR_APPROVAL] {error}: {message}", file=sys.stderr, flush=True)
    return EXIT_REFUSED


def require_write_approval(script: str, paket: str = "", transport: str = "",
                           zip_dosyasi: str = "", url: str | None = None) -> int | None:
    """None: yazma onaylı (kimlik AXET_ABAPGIT_ONAY_ID'de, alt adımlara geçer).

    Aksi hâlde script'in döneceği çıkış kodu; mesaj basılmış olur:
      3 — onay NTT Studio penceresinde bekliyor. stdout'a `approval_pending:` ile
          başlayan satır basılır; kullanıcı onaylayınca AYNI komut tekrar çalıştırılır.
      2 — reddedildi, mod uygun değil, sunucuya ulaşılamadı ya da cevap anlaşılmadı.
    Kapalı başarısız: 'izinli' dışındaki her şey ret.
    """
    token = os.environ.get("ABAP_HTTP_TOKEN", "")
    if not token:
        return _refuse("approval_unavailable",
                       "ABAP_HTTP_TOKEN ortamda yok. Bu script NTT Studio'nun DEV oturumundaki "
                       "ajan terminalinden çalıştırılmalı.")
    zip_abs = str(Path(zip_dosyasi).resolve()) if zip_dosyasi else ""
    body = {"script": Path(script).name, "paket": paket or "", "transport": transport or "",
            "zip_dosyasi": zip_abs, "ust_onay": os.environ.get(APPROVAL_ENV, "")}
    req = urllib.request.Request(
        (url or ADT_HTTP_URL) + "/tool/axet_abapgit_onay",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        method="POST")
    # Kurumsal makinede HTTP(S)_PROXY tanımlı olabilir; loopback proxy'ye gitmesin.
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        with opener.open(req, timeout=_TIMEOUT_S) as resp:
            out = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code == 401:
            return _refuse("approval_unavailable", "8787 token'ı kabul etmedi (401).")
        if exc.code == 404:
            return _refuse("approval_unavailable",
                           "8787'deki sunucuda axet_abapgit_onay yok: onaylı sunucu çalışmıyor. "
                           "NTT Studio'da sistemi DEV olarak yeniden aç.")
        if exc.code == 503:
            return _refuse("sap_session_busy",
                           "SAP oturumu başka bir çağrıda meşgul. Biraz sonra aynı komutu tekrar çalıştır.")
        return _refuse("approval_unavailable", f"8787 HTTP {exc.code} döndü.")
    except (urllib.error.URLError, OSError, ValueError) as exc:
        return _refuse("approval_unavailable",
                       f"8787'ye ulaşılamadı ya da cevap okunamadı ({exc}). "
                       "Onaylı sunucu olmadan SAP'a yazılmaz.")
    if not isinstance(out, dict):
        return _refuse("approval_unavailable", "8787'nin cevabı anlaşılmadı.")
    onay_id = out.get("onay_id")
    if out.get("ok") is True and isinstance(onay_id, str) and onay_id:
        os.environ[APPROVAL_ENV] = onay_id
        return None
    error = str(out.get("error") or "approval_unavailable")
    message = str(out.get("message") or error)
    if error == "approval_pending":
        print(f"approval_pending: {message}", flush=True)
        return EXIT_PENDING
    return _refuse(error, message)

