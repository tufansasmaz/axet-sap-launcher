#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NTT Studio — gated_quality.py testleri. SAP yok, ağ yok.

    py -3 resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_gated_quality.py

Her test yakaladığı hatayı söyler. Çıkış kodu 0 = hepsi geçti.
"""
from __future__ import annotations

import json
import sys
import tempfile
import zipfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

_SCRIPTS_DIR = Path(__file__).resolve().parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

import gated_quality as gq  # noqa: E402

RESULTS = []


def check(name, catches, fn):
    try:
        fn()
        RESULTS.append(("PASS", name, catches, ""))
    except AssertionError as exc:
        RESULTS.append(("FAIL", name, catches, str(exc)))
    except Exception as exc:  # noqa: BLE001 — çökme de başarısızlık
        RESULTS.append(("FAIL", name, catches, f"{type(exc).__name__}: {exc}"))


def tmpdir() -> Path:
    return Path(tempfile.mkdtemp(prefix="gq-"))


def put_review(pd: Path, tip, ad, hashes, **bulgular):
    b = {"kritik": 0, "yuksek": 0, "orta": 0, "dusuk": 0, **bulgular}
    p = gq.review_path(pd, tip, ad)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps({"nesne": ad, "tip": tip, "kaynak_sha256": hashes, "bulgular": b}), encoding="utf-8")


def t_src_hash_crlf():
    assert gq.src_hash(b"a\r\nb\r\n") == gq.src_hash(b"a\nb\n")
    assert gq.src_hash(b"a\nb") != gq.src_hash(b"a\nc")


def t_review_path():
    pd = Path("/p")
    assert gq.review_path(pd, "clas", "zcl_a").name == "CLAS_ZCL_A.json"
    assert gq.review_path(pd, "CLAS", "/ABC/CL_X").name == "CLAS_#ABC#CL_X.json"
    assert gq.review_path(pd, "CLAS", "/ABC/CL_X").parent.name == ".sap-review"


def t_check_no_hashes_no_gate():
    assert gq.check(tmpdir(), "DOMA", "ZD", []) == (None, None)


def t_check_missing():
    assert gq.check(tmpdir(), "CLAS", "ZCL_A", ["1" * 64]) == ("inceleme_yok", None)


def t_check_corrupt():
    pd = tmpdir()
    p = gq.review_path(pd, "CLAS", "ZCL_A")
    p.parent.mkdir(parents=True)
    p.write_text("{bozuk", encoding="utf-8")
    assert gq.check(pd, "CLAS", "ZCL_A", ["1" * 64])[0] == "inceleme_yok"
    put_review(pd, "CLAS", "ZCL_A", ["1" * 64], kritik=True)
    assert gq.check(pd, "CLAS", "ZCL_A", ["1" * 64])[0] == "inceleme_yok", "bool sayı kabul edildi"
    put_review(pd, "CLAS", "ZCL_A", "1" * 64)
    assert gq.check(pd, "CLAS", "ZCL_A", ["1" * 64])[0] == "inceleme_yok", "liste olmayan hash kabul edildi"


def t_check_stale():
    pd = tmpdir()
    put_review(pd, "CLAS", "ZCL_A", ["1" * 64], yuksek=2)
    reason, kalite = gq.check(pd, "CLAS", "ZCL_A", ["2" * 64])
    assert reason == "inceleme_eski" and kalite["yuksek"] == 2


def t_check_subset_ok():
    pd = tmpdir()
    put_review(pd, "CLAS", "ZCL_A", ["1" * 64, "2" * 64], orta=3)
    assert gq.check(pd, "CLAS", "ZCL_A", ["2" * 64]) == (None, {"kritik": 0, "yuksek": 0, "orta": 3, "dusuk": 0})
    assert gq.check(pd, "CLAS", "ZCL_A", ["2" * 64, "3" * 64])[0] == "inceleme_eski"


def t_check_kritik():
    pd = tmpdir()
    put_review(pd, "CLAS", "ZCL_A", ["1" * 64], kritik=1)
    assert gq.check(pd, "CLAS", "ZCL_A", ["1" * 64])[0] == "kritik_bulgu"


def t_write_review():
    pd = tmpdir()
    (pd / "src").mkdir()
    (pd / "src" / "zcl_a.clas.abap").write_bytes(b"CLASS zcl_a.\r\nENDCLASS.\r\n")
    rec = gq.write_review(pd, "zcl_a", "clas", ["src/zcl_a.clas.abap"], {"kritik": 0, "yuksek": 1})
    assert rec["kaynak_sha256"] == [gq.src_hash(b"CLASS zcl_a.\nENDCLASS.\n")]
    assert rec["nesne"] == "ZCL_A" and rec["tip"] == "CLAS"
    assert rec["bulgular"] == {"kritik": 0, "yuksek": 1, "orta": 0, "dusuk": 0}
    assert gq.check(pd, "CLAS", "ZCL_A", rec["kaynak_sha256"]) == (None, rec["bulgular"])
    assert not list((pd / ".sap-review").glob("*.tmp")), "geçici dosya kaldı"


def t_write_review_refuses():
    pd = tmpdir()
    for files, bulgular in ((["yok.abap"], {"kritik": 0}), ([], {"kritik": 0}),
                            (["x"], {"kritik": -1}), (["x"], {"kritik": "0"})):
        try:
            gq.write_review(pd, "ZCL_A", "CLAS", files, bulgular)
        except ValueError:
            continue
        raise AssertionError(f"kabul edildi: {files} {bulgular}")
    assert not (pd / ".sap-review").exists()


def _zip(path: Path, entries):
    with zipfile.ZipFile(path, "w") as z:
        for name, data in entries:
            z.writestr(name, data)


def t_zip_objects():
    d = tmpdir()
    entries = [
        ("src/zcl_a.clas.abap", b"CLASS zcl_a.\r\n"),
        ("src/zcl_a.clas.locals_imp.abap", b"* yerel\n"),
        ("src/zcl_a.clas.xml", b"<xml/>"),
        ("src/#abc#cl_x.clas.abap", b"CLASS /abc/cl_x.\n"),
        ("src/zi_v.ddls.asddls", b"define view entity ZI_V"),
        ("src/package.devc.xml", b"<devc/>"),
    ]
    _zip(d / "a.zip", entries)
    objs, h1 = gq.zip_objects(d / "a.zip")
    keys = [(o["tip"], o["ad"], len(o["kaynak_sha256"])) for o in objs]
    assert keys == [("CLAS", "/ABC/CL_X", 1), ("CLAS", "ZCL_A", 2), ("DDLS", "ZI_V", 1)], keys
    assert gq.src_hash(b"CLASS zcl_a.\n") in objs[1]["kaynak_sha256"]
    # Sıra ve satır sonu ZIP hash'ini değiştirmez; XML içeriği değiştirir.
    _zip(d / "b.zip", [(n, b.replace(b"\r\n", b"\n")) for n, b in reversed(entries)])
    assert gq.zip_objects(d / "b.zip")[1] == h1
    _zip(d / "c.zip", [(n, b"<xml2/>" if n.endswith("clas.xml") else b) for n, b in entries])
    assert gq.zip_objects(d / "c.zip")[1] != h1


def t_diff():
    assert gq.diff(None, "x") == ("", False)
    text, cut = gq.diff("a\r\nb\r\n", "a\nc\n")
    assert "-b" in text and "+c" in text and not cut
    assert gq.diff("a\n", "a\n") == ("", False)
    text, cut = gq.diff("", "\n".join(f"s{i}" for i in range(1000)))
    assert cut and len(text.splitlines()) == gq.MAX_DIFF_LINES
    text, cut = gq.diff("", "x" * 100_000)
    assert cut and len(text) == gq.MAX_DIFF_CHARS


TESTS = [
    ("src_hash_crlf", "abapGit ZIP'i ile yerel dosya satır sonu yüzünden farklı hash alıyor", t_src_hash_crlf),
    ("review_path", "namespace'li nesnenin inceleme dosyası alt klasöre düşüyor", t_review_path),
    ("check_no_hashes", "kaynaksız yazma (domain) inceleme istiyor", t_check_no_hashes_no_gate),
    ("check_missing", "incelenmemiş kaynak geçiyor", t_check_missing),
    ("check_corrupt", "bozuk/uydurma kayıt geçiyor", t_check_corrupt),
    ("check_stale", "inceleme sonrası değişen kaynak geçiyor", t_check_stale),
    ("check_subset", "include'lu sınıfın tek include'u reddediliyor ya da yeni include geçiyor", t_check_subset_ok),
    ("check_kritik", "kritik bulgulu kaynak geçiyor", t_check_kritik),
    ("write_review", "kayıt hash'i dosyadan değil beyandan geliyor", t_write_review),
    ("write_review_refuses", "eksik dosya/geçersiz sayı ile kayıt yazılıyor", t_write_review_refuses),
    ("zip_objects", "ZIP nesnelere yanlış bölünüyor ya da ZIP hash'i kararsız", t_zip_objects),
    ("diff", "fark kırpılmıyor ya da satır sonu farkı fark sayılıyor", t_diff),
]


def main():
    for name, catches, fn in TESTS:
        check(name, catches, fn)
    for status, name, catches, detail in RESULTS:
        print(f"{status}  {name}  — {catches}")
        if detail:
            print(f"      {detail}")
    failed = sum(1 for r in RESULTS if r[0] == "FAIL")
    print(f"\n{len(RESULTS) - failed}/{len(RESULTS)} geçti")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
