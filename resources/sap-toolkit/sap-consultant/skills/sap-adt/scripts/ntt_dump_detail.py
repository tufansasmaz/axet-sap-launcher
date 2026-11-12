#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NTT Studio — `adt_dump_detail`: bir kısa dump'ın (ST22) içini okuyan araç.

YUKARI AKIŞTA YOK. Motor (adt_mcp_server.py, sap_adt_lib.py) değişmedi; araç
motorun FastMCP kaydına buradan ekleniyor ve iki 8787 sunucusu da (salt okunur
ve onaylı yazma) `install()` çağırıyor.

Neden: motorun `adt_dumps`'ı yalnız listeyi veriyor (başlık, kullanıcı, tarih,
`adt://SID/...` biçiminde bir adres) ve o adres doğrudan açılmıyor. Bir modül
danışmanı (2026-10-15) "hatayı bulamıyorum" dedi. Gerçek bir sistemde ölçüldü
(2026-10-16): `GET /sap/bc/adt/runtime/dump/<id>` bölüm listesini ve hatanın
düştüğü kaynağa bağlantıyı (include + satır) veriyor; `.../formatted` dump'ın
tam düz metnini. İkisi de OKUMA.

Ne verilmiyor: "Chosen Variables" (alan değerleri: müşteri, tutar…) varsayılan
olarak yok. İstenirse DEV'de serbest, QA/PRD'de `adt_sql`'deki KVKK kuralıyla
aynı: `acknowledge_risk=true` + onaylayan bir sözcük (GR_PII). Sistem ortamı,
kullanıcı/terminal ve BASIS bölümleri (kernel, kontrol blokları) hiç
verilmiyor: hatayı bulmaya katkısı yok, kişisel ve altyapı bilgisi var.

Motorun `adt_dumps`'ı da (2026-11-12 kit senkronu) `dump=` + `sections=` ile dump
metnini veriyor ve `sections` başlık ÖNEKİYLE seçiyor: "Chosen variables",
"Contents of system fields", "Directory of Application Tables" … değer taşıyor.
`install()` onu da sarıyor (`gate_adt_dumps`): DEV dışında motorun varsayılan
bölümleri dışındaki her bölüm aynı GR_PII onayını istiyor. Liste kipi serbest.

Test: `py -3 test_ntt_dump_detail.py` (sahte motor ve oturum; SAP yok).
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from urllib.parse import quote

# SAP'nin bölüm kimlikleri dilden bağımsız (başlıklar oturum diline göre değişiyor).
DEVELOPER_SECTIONS = ("kap0", "kap1", "kap2", "kap3", "kap4", "kap7", "kap8", "kap11")
VARIABLES_SECTION = "kap10"
MAX_SECTION_CHARS = 6000

_NS = "{http://www.sap.com/adt/categories/dump}"
_TERMINATION = "/runtime/dump/termination"


def dump_path(dump: str) -> str:
    """`adt_dumps`'ın verdiği adres, başka bir biçimi ya da çıplak kimlik → okuma adresi."""
    text = (dump or "").strip()
    if not text:
        raise ValueError("dump boş: adt_dumps'ın verdiği 'uri' değerini geçin")
    m = re.search(r"/runtime/dumps?/([^/?#]+)", text)
    ident = m.group(1) if m else text
    if "/" in ident:
        raise ValueError(f"dump kimliği çözülemedi: {text[:120]}")
    # Liste kimliği zaten kodlu veriyor (%20); çıplak kimlikte boşluk varsa kodla.
    if " " in ident:
        ident = quote(ident, safe="%")
    return f"/sap/bc/adt/runtime/dump/{ident}"


def _attr(el, name: str) -> str:
    return el.get(_NS + name) or el.get(name) or ""


def parse_dump_xml(xml_text: str) -> dict:
    root = ET.fromstring(xml_text)
    header = {
        "title": _attr(root, "title"),
        "error": _attr(root, "error"),
        "exception": _attr(root, "exception"),
        "user": _attr(root, "author"),
        "program": _attr(root, "terminatedProgram"),
        "datetime": _attr(root, "datetime"),
    }
    chapters = []
    for ch in root.iter(_NS + "chapter"):
        try:
            line = int(_attr(ch, "line"))
        except ValueError:
            continue
        chapters.append({"name": _attr(ch, "name"), "title": _attr(ch, "title"), "line": line})
    chapters.sort(key=lambda c: c["line"])

    termination = None
    for link in root.iter(_NS + "link"):
        if not _attr(link, "relation").endswith(_TERMINATION):
            continue
        uri = _attr(link, "uri")
        path = "/sap/" + uri.split("/sap/", 1)[1] if "/sap/" in uri else uri
        base, _, frag = path.partition("#")
        line_m = re.search(r"start=(\d+)", frag)
        inc_m = re.search(r"/([^/]+)/source/main$", base)
        termination = {
            "uri": base,
            "include": inc_m.group(1).upper() if inc_m else "",
            "line": int(line_m.group(1)) if line_m else None,
        }
        break
    return {"header": header, "chapters": chapters, "termination": termination}


def slice_sections(text: str, chapters: list, wanted: set) -> list:
    """Bölümün başladığı satırdan bir sonrakine kadar; uzunsa kırpılmış."""
    lines = text.splitlines()
    out = []
    for i, ch in enumerate(chapters):
        if ch["name"] not in wanted:
            continue
        start = max(ch["line"] - 1, 0)
        end = chapters[i + 1]["line"] - 1 if i + 1 < len(chapters) else len(lines)
        body = "\n".join(lines[start:end]).rstrip()
        truncated = len(body) > MAX_SECTION_CHARS
        if truncated:
            body = body[:MAX_SECTION_CHARS] + "\n…(kırpıldı)"
        out.append({"name": ch["name"], "title": ch["title"], "text": body, "truncated": truncated})
    return out


def _pii_approved(guardrails, acknowledge_risk: bool, approval_text: str) -> bool:
    """DEV'de serbest; değilse kullanıcının açık onayı (adt_sql'deki KVKK kuralı)."""
    if guardrails.get_active_tier() == "DEV":
        return True
    return bool(acknowledge_risk) and str(approval_text or "").strip().lower() in guardrails._AFFIRMATIVE


def _require_variables_ok(guardrails, acknowledge_risk: bool, approval_text: str) -> None:
    if _pii_approved(guardrails, acknowledge_risk, approval_text):
        return
    raise guardrails.GuardrailViolation(
        "GR_PII",
        "Dump'ın 'Chosen Variables' bölümü alan değerleri (müşteri, tutar…) içerir ve bu "
        "sistem DEV değil. Kullanıcıya sorun; açıkça 'onay' derse acknowledge_risk=true ve "
        "approval_text='onay' ile tekrar çağırın. Onayı kendiniz vermeyin. Değişkensiz "
        "okuma (include_variables=false) onay istemez.",
    )


# --- motorun adt_dumps'ı -----------------------------------------------------------------
# Motorun varsayılan bölümleri (sap_adt_lib.DUMP_DEFAULT_SECTIONS): alan değeri yok.
# Bunların dışındaki her başlık (Chosen variables, Contents of system fields,
# Directory of Application Tables, User and Transaction, System environment…)
# DEV dışında onaylı. İzin listesi: bilinmeyen ya da başka dilde bir başlık da kapalı.
SAFE_DUMP_SECTIONS = ("short text", "what happened", "error analysis", "how to correct",
                      "information on where terminated", "source code extract", "active calls")
_ADT_DUMPS_PARAMS = ("max_results", "dump", "sections", "max_chars", "group", "new_hours")


def _safe_title(title: str) -> bool:
    t = str(title or "").strip().lower()
    return any(t.startswith(d) for d in SAFE_DUMP_SECTIONS)


def _safe_request(prefix: str) -> bool:
    """Motor `title.startswith(prefix)` ile seçiyor; önek güvenli bir başlığa ait olmalı."""
    w = prefix.strip().lower()
    return any(d.startswith(w) or w.startswith(d) for d in SAFE_DUMP_SECTIONS)


def _pii_dumps_violation(guardrails, names: list):
    return guardrails.GuardrailViolation(
        "GR_PII",
        f"İstenen dump bölümleri ({', '.join(names)}) alan değerleri (müşteri, tutar, kullanıcı…) "
        "içerebilir ve bu sistem DEV değil. Kullanıcıya sorun; açıkça 'onay' derse "
        "acknowledge_risk=true ve approval_text='onay' ile tekrar çağırın. Onayı kendiniz "
        "vermeyin. Varsayılan bölümler (sections boş) ve liste kipi onay istemez.",
    )


def _refusal(engine, exc) -> dict:
    """Motorun kapı biçimi: {ok: false, error: guardrail_violation, code: GR_PII, message}.
    engine._err bir GuardrailViolation'ı tanımıyor ve 'unexpected' diyordu."""
    as_dict = getattr(exc, "as_dict", None)
    if callable(as_dict):
        return as_dict()
    code = getattr(exc, "code", "")
    if code:
        return {"ok": False, "error": "guardrail_violation", "code": code, "message": str(exc)}
    return engine._err(exc)


def _replace_tool(mcp, name: str, fn) -> None:
    """FastMCP aynı adla ikinci kaydı yok sayıyor (eskisini tutuyor): önce sil."""
    remove = getattr(mcp, "remove_tool", None)
    if not callable(remove):
        tm = getattr(mcp, "_tool_manager", None)
        remove = getattr(tm, "remove_tool", None) if tm is not None else None
    if callable(remove):
        remove(name)
    else:
        mcp._tool_manager._tools.pop(name, None)
    mcp.tool()(fn)


def gate_adt_dumps(engine, guardrails) -> None:
    """Motorun adt_dumps'ını GR_PII kapısıyla sarar; kayıt ve modül global'i yenisi olur."""
    orig = getattr(engine, "adt_dumps", None)
    if orig is None:
        return
    import inspect
    got = tuple(inspect.signature(orig).parameters)
    if got != _ADT_DUMPS_PARAMS:
        raise RuntimeError(
            f"[ntt_dump_detail] adt_dumps imzası değişti: {got} (beklenen {_ADT_DUMPS_PARAMS}). "
            "Dump kapısı yeni parametreleri bilmiyor; gate_adt_dumps'ı güncelleyin.")

    def adt_dumps(max_results: int = 10, dump: str = "", sections: str = "",
                  max_chars: int = 6000, group: bool = False, new_hours: int = 24,
                  acknowledge_risk: bool = False, approval_text: str = "") -> dict:
        approved = _pii_approved(guardrails, acknowledge_risk, approval_text) if dump else True
        if not approved:
            asked = [w.strip() for w in str(sections or "").split(",") if w.strip()]
            risky = [w for w in asked if not _safe_request(w)]
            if risky:
                return _refusal(engine, _pii_dumps_violation(guardrails, risky))
        result = orig(max_results=max_results, dump=dump, sections=sections,
                      max_chars=max_chars, group=group, new_hours=new_hours)
        if approved or not isinstance(result, dict) or not isinstance(result.get("sections"), dict):
            return result
        withheld = [t for t in result["sections"] if not _safe_title(t)]
        if withheld:
            result["sections"] = {t: b for t, b in result["sections"].items() if _safe_title(t)}
            result["truncated"] = [t for t in result.get("truncated") or [] if _safe_title(t)]
            result["withheld"] = withheld
            result["note"] = str(_pii_dumps_violation(guardrails, withheld)) + " (GR_PII)"
        return result

    adt_dumps.__doc__ = (orig.__doc__ or "").rstrip() + (
        "\n\n    NTT Studio: on a non-DEV system any chapter outside the default ones "
        "(e.g. 'Chosen variables', 'Contents of system fields') needs the USER's explicit "
        "approval (acknowledge_risk=true, approval_text='onay') -- never supply it yourself. "
        "Without it the call is refused (GR_PII) or those chapters are withheld.")
    _replace_tool(engine.mcp, "adt_dumps", adt_dumps)
    setattr(engine, "adt_dumps", adt_dumps)


def install(engine, guardrails) -> None:
    """Aracı motorun kaydına ve modül global'ine ekler (HTTP yolu aracı oradan buluyor).
    Motorun adt_dumps'ı da GR_PII kapısıyla yeniden kaydedilir (gate_adt_dumps)."""

    def adt_dump_detail(dump: str, include_variables: bool = False,
                        acknowledge_risk: bool = False, approval_text: str = "") -> dict:
        """Read ONE short dump (ST22) in detail — READ-ONLY. Pass the `uri` from adt_dumps.
        Returns the header (error, exception, program, user, time), where it terminated
        (include + line) and the developer sections: short text, what happened, error
        analysis, how to correct, where terminated, source code extract, active calls.
        Next step: open `termination.include` with adt_get_source and read around the line.
        Field values ('Chosen Variables') are omitted unless include_variables=true; on a
        non-DEV system that also needs the USER's explicit approval (acknowledge_risk=true,
        approval_text='onay') — never supply it yourself."""
        try:
            if include_variables:
                _require_variables_ok(guardrails, acknowledge_risk, approval_text)
            path = dump_path(dump)
            adt = engine._get_client().adt_client
            headers = adt._get_headers(accept_type="*/*")
            with engine._quiet():
                meta = adt.session.get(adt.url + path, headers=headers, timeout=adt.timeout_short)
                if meta.status_code != 200:
                    return {"ok": False, "error": "dump_not_found" if meta.status_code == 404 else "http_error",
                            "message": f"HTTP {meta.status_code}: {(meta.text or '')[:200]}"}
                parsed = parse_dump_xml(meta.text)
                body = adt.session.get(adt.url + path + "/formatted", headers=headers, timeout=adt.timeout_short)
                if body.status_code != 200:
                    return {"ok": False, "error": "http_error",
                            "message": f"formatted: HTTP {body.status_code}: {(body.text or '')[:200]}"}
            wanted = set(DEVELOPER_SECTIONS) | ({VARIABLES_SECTION} if include_variables else set())
            sections = slice_sections(body.text or "", parsed["chapters"], wanted)
            omitted = [c["name"] for c in parsed["chapters"] if c["name"] not in wanted]
            term = parsed["termination"]
            next_step = (
                f"Open include {term['include']} with adt_get_source and read around line {term['line']}; "
                "the 'Source Code Extract' section above already shows the lines around the error."
                if term and term.get("include") else
                "No source link in this dump; use 'Information on where terminated' to find the program."
            )
            return {"ok": True, "header": parsed["header"], "termination": term,
                    "sections": sections, "omitted": omitted, "next_step": next_step}
        except guardrails.GuardrailViolation as exc:
            return _refusal(engine, exc)
        except Exception as exc:  # motorun hata biçimi: {ok, error, message, hint}
            return engine._err(exc)

    engine.mcp.tool()(adt_dump_detail)
    setattr(engine, "adt_dump_detail", adt_dump_detail)
    gate_adt_dumps(engine, guardrails)
