#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NTT Studio — ntt_dump_detail.py testleri. Sahte motor ve sahte ADT oturumuyla; SAP yok.

    PYTHONIOENCODING=utf-8 py -3 resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_ntt_dump_detail.py

Dump'ın XML'i (bölümler + hata yerine bağlantı) ve düz metni, gerçek bir
sistemde (2026-10-16) ölçülen biçimle kuruluyor. Çıkış kodu 0 = hepsi geçti.
"""
from __future__ import annotations

import contextlib
import sys
import types
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

_SCRIPTS_DIR = Path(__file__).resolve().parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

import ntt_dump_detail as dd  # noqa: E402

RESULTS = []


def pii(r):
    """Motorun kapı biçimi: error=guardrail_violation, code=GR_PII."""
    return isinstance(r, dict) and r.get("ok") is False and r.get("error") == "guardrail_violation" \
        and r.get("code") == "GR_PII"


def check(name, ok, detail=""):
    RESULTS.append(ok)
    print(("GECTI " if ok else "KALDI ") + name + ("" if ok else f" -- {detail}"))


ID = "20261016085512LMKERPDEV_LED_00%20%20%20%20D_USER%20%20100%20%20%209"

XML = f"""<?xml version="1.0" encoding="utf-8"?>
<dump:dump xmlns:dump="http://www.sap.com/adt/categories/dump" dump:title="Syntax error in program" dump:error="DYNPRO_SYNTAX_ERROR" dump:exception="" dump:author="D_USER" dump:terminatedProgram="SAPLZAGE_FG" dump:datetime="2026-10-16T08:55:12Z">
  <dump:chapters>
    <dump:chapter dump:name="kap5" dump:title="System environment" dump:category="System Environment" dump:line="9" dump:chapterOrder="6" dump:categoryOrder="1"/>
    <dump:chapter dump:name="kap6" dump:title="User and Transaction" dump:category="System Environment" dump:line="11" dump:chapterOrder="7" dump:categoryOrder="1"/>
    <dump:chapter dump:name="kap1" dump:title="What happened?" dump:category="User View" dump:line="3" dump:chapterOrder="2" dump:categoryOrder="2"/>
    <dump:chapter dump:name="kap0" dump:title="Short Text" dump:category="ABAP Developer View" dump:line="1" dump:chapterOrder="1" dump:categoryOrder="3"/>
    <dump:chapter dump:name="kap3" dump:title="Error analysis" dump:category="ABAP Developer View" dump:line="5" dump:chapterOrder="4" dump:categoryOrder="3"/>
    <dump:chapter dump:name="kap8" dump:title="Source Code Extract" dump:category="ABAP Developer View" dump:line="7" dump:chapterOrder="9" dump:categoryOrder="3"/>
    <dump:chapter dump:name="kap10" dump:title="Chosen Variables" dump:category="ABAP Developer View" dump:line="13" dump:chapterOrder="12" dump:categoryOrder="3"/>
    <dump:chapter dump:name="kap13" dump:title="Active Calls in SAP Kernel" dump:category="BASIS Developer View" dump:line="15" dump:chapterOrder="15" dump:categoryOrder="4"/>
  </dump:chapters>
  <dump:links>
    <dump:link dump:relation="contents" dump:uri="/sap/bc/adt/runtime/dump/{ID}/formatted" dump:contentType="text/plain"/>
    <dump:link dump:relation="http://www.sap.com/adt/relations/runtime/dump/termination" dump:uri="adt://LED/sap/bc/adt/functions/groups/svim/includes/lsvimf45/source/main#start=219" dump:contentType=""/>
  </dump:links>
</dump:dump>"""

TEXT = "\n".join([
    "Short Text",                       # 1  kap0
    "    Syntax error in program SAPLZAGE_FG",
    "What happened?",                   # 3  kap1
    "    Error in the ABAP application program.",
    "Error analysis",                   # 5  kap3
    "    The program has a syntax error.",
    "Source Code Extract",              # 7  kap8
    ">>>>>   219 PERFORM vim_x USING x.",
    "System environment",               # 9  kap5
    "    SAP Release 758",
    "User and Transaction",             # 11 kap6
    "    Terminal 10.1.2.3",
    "Chosen Variables",                 # 13 kap10
    "    KUNNR 0000123456 MUSTERI ADI",
    "Active Calls in SAP Kernel",       # 15 kap13
    "    ab_rfcimport",
])


class FakeResp:
    def __init__(self, status, text):
        self.status_code = status
        self.text = text


class FakeAdt:
    url = "http://127.0.0.1:8788"
    timeout_short = 30

    def __init__(self):
        self.calls = []
        self.session = types.SimpleNamespace(get=self._get)

    def _get_headers(self, accept_type=None):
        return {"Accept": accept_type}

    def _get(self, url, headers=None, timeout=None, **_):
        path = url[len(self.url):]
        self.calls.append(path)
        if path == f"/sap/bc/adt/runtime/dump/{ID}":
            return FakeResp(200, XML)
        if path == f"/sap/bc/adt/runtime/dump/{ID}/formatted":
            return FakeResp(200, TEXT)
        return FakeResp(404, "No application class found")


class Violation(Exception):
    def __init__(self, code, message, **ctx):
        super().__init__(message)
        self.code = code


def fake_engine():
    registered = {}
    adt = FakeAdt()

    def tool():
        def deco(fn):
            registered[fn.__name__] = fn
            return fn
        return deco

    eng = types.SimpleNamespace(
        mcp=types.SimpleNamespace(tool=tool),
        _get_client=lambda: types.SimpleNamespace(adt_client=adt),
        _quiet=contextlib.nullcontext,
        _err=lambda exc: {"ok": False, "error": getattr(exc, "code", type(exc).__name__), "message": str(exc)},
    )
    return eng, registered, adt


def fake_guardrails(tier):
    return types.SimpleNamespace(
        get_active_tier=lambda: tier,
        _AFFIRMATIVE={"onay", "approve", "proceed"},
        GuardrailViolation=Violation,
    )


# --- adres biçimleri ------------------------------------------------------------
want = f"/sap/bc/adt/runtime/dump/{ID}"
for raw in (
    f"adt://LED/sap/bc/adt/runtime/dumps/{ID}",       # adt_dumps'ın verdiği (rel=self)
    f"adt://LED/sap/bc/adt/vit/runtime/dumps/{ID}",   # rel=alternate (SAP GUI)
    f"/sap/bc/adt/runtime/dump/{ID}",
    f"http://127.0.0.1:8788/sap/bc/adt/runtime/dumps/{ID}",
    ID,
):
    got = dd.dump_path(raw)
    check(f"dump_path({raw[:40]}…)", got == want, repr(got))
try:
    dd.dump_path("  ")
    check("boş girdi reddediliyor", False, "hata yok")
except ValueError:
    check("boş girdi reddediliyor", True)

# --- XML ayrıştırma ----------------------------------------------------------------
parsed = dd.parse_dump_xml(XML)
check("başlık alanları", parsed["header"] == {
    "title": "Syntax error in program", "error": "DYNPRO_SYNTAX_ERROR", "exception": "",
    "user": "D_USER", "program": "SAPLZAGE_FG", "datetime": "2026-10-16T08:55:12Z"}, repr(parsed["header"]))
check("hata yeri: include ve satır", parsed["termination"] == {
    "uri": "/sap/bc/adt/functions/groups/svim/includes/lsvimf45/source/main",
    "include": "LSVIMF45", "line": 219}, repr(parsed["termination"]))
check("bölümler satır sırasında", [c["name"] for c in parsed["chapters"]] ==
      ["kap0", "kap1", "kap3", "kap8", "kap5", "kap6", "kap10", "kap13"], repr(parsed["chapters"]))

# --- araç: DEV, değişkensiz --------------------------------------------------------
eng, reg, adt = fake_engine()
dd.install(eng, fake_guardrails("DEV"))
check("araç kayıtlı ve modül global'i", "adt_dump_detail" in reg and getattr(eng, "adt_dump_detail", None) is reg["adt_dump_detail"])
r = reg["adt_dump_detail"](dump=f"adt://LED/sap/bc/adt/runtime/dumps/{ID}")
check("ok", r.get("ok") is True, repr(r)[:300])
names = [s["name"] for s in r.get("sections", [])]
check("yalnız geliştirici bölümleri; değişken, sistem/kullanıcı ve BASIS yok",
      names == ["kap0", "kap1", "kap3", "kap8"], repr(names))
body = " ".join(s["text"] for s in r.get("sections", []))
check("bölüm metni doğru dilim", "syntax error" in body.lower() and ">>>>>   219" in body and "SAP Release" not in body, body)
check("müşteri verisi (değişken) yok", "MUSTERI" not in repr(r) and "Terminal" not in repr(r), repr(r)[:300])
check("hata yeri ve sonraki adım", r.get("termination", {}).get("line") == 219 and "LSVIMF45" in r.get("next_step", ""), repr(r.get("next_step")))
check("değişkenlerin atlandığı söyleniyor", "kap10" in r.get("omitted", []), repr(r.get("omitted")))
check("iki GET, ikisi de dump adresine", adt.calls == [want, want + "/formatted"], repr(adt.calls))

# --- değişkenler -----------------------------------------------------------------------
eng, reg, _ = fake_engine()
dd.install(eng, fake_guardrails("DEV"))
r = reg["adt_dump_detail"](dump=ID, include_variables=True)
check("DEV: değişkenler istenince geliyor", any(s["name"] == "kap10" for s in r.get("sections", [])), repr(r)[:300])

eng, reg, adt = fake_engine()
dd.install(eng, fake_guardrails("PRD"))
r = reg["adt_dump_detail"](dump=ID, include_variables=True)
check("PRD: onaysız değişken reddediliyor (GR_PII), SAP'ye gidilmiyor",
      pii(r) and adt.calls == [], repr(r)[:300])
r = reg["adt_dump_detail"](dump=ID, include_variables=True, acknowledge_risk=True, approval_text="belki")
check("PRD: belirsiz onay metni yetmiyor", pii(r), repr(r)[:200])
r = reg["adt_dump_detail"](dump=ID, include_variables=True, acknowledge_risk=True, approval_text="onay")
check("PRD: açık onayla geliyor", r.get("ok") is True and any(s["name"] == "kap10" for s in r["sections"]), repr(r)[:200])
r = reg["adt_dump_detail"](dump=ID)
check("PRD: değişkensiz okuma onay istemiyor", r.get("ok") is True, repr(r)[:200])

# --- uzun bölüm kırpılıyor ---------------------------------------------------------------
long_text = TEXT.replace("    The program has a syntax error.", "x" * (dd.MAX_SECTION_CHARS + 500))
sections = dd.slice_sections(long_text, parsed["chapters"], {"kap3"})
check("uzun bölüm kırpılıyor", len(sections[0]["text"]) <= dd.MAX_SECTION_CHARS + 40 and sections[0]["truncated"] is True,
      str(len(sections[0]["text"])))

# --- SAP hatası --------------------------------------------------------------------------
eng, reg, adt = fake_engine()
dd.install(eng, fake_guardrails("DEV"))
r = reg["adt_dump_detail"](dump="20991231000000XXX")
check("bulunamayan dump: ok false, HTTP durumu", r.get("ok") is False and "404" in str(r.get("message", "")) + str(r.get("error", "")), repr(r)[:200])

# --- motorun adt_dumps'ı: dump ayrıntısında değer taşıyan bölümler (2026-11-12) -----------
# Motorun parse_formatted_dump'ı başlık ÖNEKİYLE seçiyor (ölçüldü: sections="c" hem
# "Chosen variables" hem "Contents of system fields" getiriyor). Sahte motor aynısını yapıyor.
CHAPTERS = {
    "Short Text": "Division by 0",
    "Error analysis": "The program divided by zero.",
    "Source Code Extract": ">>>>>   12 x = a / b.",
    "Active Calls/Events": "No. Ty. Program ZFOO",
    "Chosen variables": "KUNNR 0000123456 MUSTERI ADI",
    "Contents of system fields": "SY-UNAME MEHMET",
    "Directory of Application Tables": "KNA1 0000123456 MUSTERI ADI",
    "User and Transaction": "Terminal 10.1.2.3",
    "System environment": "SAP Release 758 Host prdapp01",
}
DEFAULTS = ("short text", "what happened", "error analysis", "how to correct",
            "information on where terminated", "source code extract", "active calls")


def fake_dumps_engine():
    eng, registered, adt = fake_engine()
    eng.dump_calls = []

    def adt_dumps(max_results: int = 10, dump: str = "", sections: str = "",
                  max_chars: int = 6000, group: bool = False, new_hours: int = 24) -> dict:
        eng.dump_calls.append({"dump": dump, "sections": sections})
        if not dump:
            return {"ok": True, "count": 1, "dumps": [{"title": "Division by 0", "user": "MEHMET",
                                                       "dump": "adt://PRD/sap/bc/adt/runtime/dumps/X"}]}
        wanted = [w.strip().lower() for w in sections.split(",") if w.strip()] or list(DEFAULTS)
        picked = {t: b for t, b in CHAPTERS.items() if any(t.lower().startswith(w) for w in wanted)}
        return {"ok": True, "dump": "/sap/bc/adt/runtime/dump/X", "header": {"Runtime Errors": "X"},
                "sections": picked, "truncated": [t for t in picked if t == "Chosen variables"],
                "available": [{"title": t, "chars": len(b)} for t, b in CHAPTERS.items()]}

    registered["adt_dumps"] = adt_dumps
    eng.adt_dumps = adt_dumps
    eng.removed = []
    eng.mcp.remove_tool = lambda name: (eng.removed.append(name), registered.pop(name, None))
    return eng, registered


VALUES = ("MUSTERI", "MEHMET", "Terminal")

eng, reg = fake_dumps_engine()
dd.install(eng, fake_guardrails("DEV"))
tool = reg["adt_dumps"]
check("adt_dumps yeniden kaydedildi (eski kayıt silindi, modül global'i yeni)",
      eng.removed == ["adt_dumps"] and getattr(eng, "adt_dumps") is tool, repr(eng.removed))
r = tool(dump="X", sections="Chosen variables")
check("DEV: Chosen variables onaysız geliyor (değişmedi)", "Chosen variables" in r.get("sections", {}), repr(r)[:300])
r = tool(dump="X", sections="c")
check("DEV: önekle iki değer bölümü de geliyor", set(r["sections"]) == {"Chosen variables", "Contents of system fields"}, repr(r)[:300])

for tier in ("PRD", "QA", "BILINMEYEN"):
    eng, reg = fake_dumps_engine()
    dd.install(eng, fake_guardrails(tier))
    tool = reg["adt_dumps"]
    r = tool(max_results=5)
    check(f"{tier}: liste kipi onaysız açık", r.get("ok") is True and r.get("dumps"), repr(r)[:200])
    r = tool(dump="X")
    check(f"{tier}: varsayılan bölümler onaysız açık, değer yok",
          r.get("ok") is True and set(r["sections"]) == {"Short Text", "Error analysis", "Source Code Extract",
                                                          "Active Calls/Events"}
          and not any(v in repr(r) for v in VALUES), repr(r)[:300])
    eng.dump_calls.clear()
    r = tool(dump="X", sections="Chosen variables")
    check(f"{tier}: Chosen variables onaysız reddediliyor (GR_PII), SAP'ye gidilmiyor",
          pii(r) and eng.dump_calls == []
          and "acknowledge_risk" in r.get("message", ""), repr(r)[:300])
    r = tool(dump="X", sections="Contents of system fields,Short Text")
    check(f"{tier}: sistem alanları da reddediliyor", pii(r), repr(r)[:200])
    r = tool(dump="X", sections="c")
    check(f"{tier}: belirsiz önek reddediliyor, değer yok",
          pii(r) and not any(v in repr(r) for v in VALUES), repr(r)[:300])
    r = tool(dump="X", sections="s")
    check(f"{tier}: 's' öneki: güvenli bölüm gelir, değerli bölüm maskelenir ve adı söylenir",
          r.get("ok") is True and "Short Text" in r["sections"] and "System environment" not in r["sections"]
          and "prdapp01" not in repr(r)
          and r.get("withheld") == ["System environment"] and "GR_PII" in r.get("note", ""), repr(r)[:400])
    r = tool(dump="X", sections="Chosen variables", acknowledge_risk=True, approval_text="belki")
    check(f"{tier}: belirsiz onay metni yetmiyor", pii(r), repr(r)[:200])
    r = tool(dump="X", sections="Chosen variables", acknowledge_risk=False, approval_text="onay")
    check(f"{tier}: acknowledge_risk olmadan yetmiyor", pii(r), repr(r)[:200])
    r = tool(dump="X", sections="Chosen variables,Directory", acknowledge_risk=True, approval_text="onay")
    check(f"{tier}: açık onayla değerler geliyor",
          r.get("ok") is True and "MUSTERI" in r["sections"].get("Chosen variables", "")
          and "Directory of Application Tables" in r["sections"] and "withheld" not in r, repr(r)[:300])
    check(f"{tier}: onay parametreleri motora geçmiyor", eng.dump_calls[-1] == {"dump": "X", "sections": "Chosen variables,Directory"},
          repr(eng.dump_calls[-1:]))

# Kit senkronunda motorun imzası değişirse kapı sessizce eskimesin: kurulum durur.
eng, reg = fake_dumps_engine()
def adt_dumps_yeni(max_results: int = 10, dump: str = "", sections: str = "", raw: bool = False) -> dict:
    return {}
eng.adt_dumps = reg["adt_dumps"] = adt_dumps_yeni
try:
    dd.install(eng, fake_guardrails("PRD"))
    check("motor imzası değişince kurulum duruyor", False, "hata yok")
except RuntimeError as exc:
    check("motor imzası değişince kurulum duruyor", "adt_dumps" in str(exc), str(exc))

failed = RESULTS.count(False)
print(f"\n{len(RESULTS) - failed}/{len(RESULTS)} geçti")
sys.exit(1 if failed else 0)
