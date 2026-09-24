#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NTT Studio — SAP DEV yazma onayı: kalite kapısı yardımcıları. SAP'a dokunmaz.

adt_gated_server.py kullanır. Burada dört iş var:

- kaynak hash'i (CRLF→LF normalize; abapGit ZIP'i ile yerel dosyanın satır sonu
  farkı aynı kaynağı iki farklı hash'e çevirmesin),
- `.sap-review/<TIP>_<NESNE>.json` inceleme kayıtlarını okuma/yazma ve kontrol,
- abapGit ZIP'ini nesnelere bölme ve ZIP'in içerik hash'i,
- onay penceresinde gösterilen birleşik fark.
"""
from __future__ import annotations

import difflib
import hashlib
import json
import os
import zipfile
from datetime import datetime, timezone
from pathlib import Path

REVIEW_DIR = ".sap-review"
MAX_DIFF_LINES = 400
MAX_DIFF_CHARS = 60_000
# abapGit'in kaynak taşıyan dosya uzantıları. XML'ler nesne sayılmaz ama ZIP hash'ine girer.
ZIP_SOURCE_EXT = (".abap", ".asddls", ".asbdef", ".asdcls", ".asddlxs")
SEVERITIES = ("kritik", "yuksek", "orta", "dusuk")


def src_hash(data: bytes) -> str:
    return hashlib.sha256(data.replace(b"\r\n", b"\n")).hexdigest()


def file_hash(path) -> str:
    return src_hash(Path(path).read_bytes())


def review_path(project_dir, tip: str, ad: str) -> Path:
    # Namespace'in '/'si dosya adında dizin ayırıcı olurdu; abapGit de '#' kullanıyor.
    return Path(project_dir) / REVIEW_DIR / f"{tip.upper()}_{ad.upper().replace('/', '#')}.json"


def read_review(project_dir, tip: str, ad: str) -> dict | None:
    try:
        data = json.loads(review_path(project_dir, tip, ad).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return data if isinstance(data, dict) else None


def quality_counts(bulgular) -> dict | None:
    """Bulgu sayıları; şekli tutmuyorsa None (bozuk kayıt, onaysız geçmez)."""
    if not isinstance(bulgular, dict):
        return None
    out = {}
    for k in SEVERITIES:
        v = bulgular.get(k, 0)
        if isinstance(v, bool) or not isinstance(v, int) or v < 0:
            return None
        out[k] = v
    return out


def check(project_dir, tip: str, ad: str, hashes) -> tuple[str | None, dict | None]:
    """(ret_sebebi, kalite). Gönderilen hash'ler incelenenlerin alt kümesi olmalı."""
    if not hashes:
        return None, None
    rec = read_review(project_dir, tip, ad)
    if rec is None:
        return "inceleme_yok", None
    kalite = quality_counts(rec.get("bulgular"))
    reviewed = rec.get("kaynak_sha256")
    if kalite is None or not isinstance(reviewed, list):
        return "inceleme_yok", None
    if not set(hashes) <= set(reviewed):
        return "inceleme_eski", kalite
    if kalite["kritik"] > 0:
        return "kritik_bulgu", kalite
    return None, kalite


def write_review(project_dir, ad: str, tip: str, kaynak_dosyalari, bulgular,
                 rapor: str = "", skill: str = "abap-code-review", now: datetime | None = None) -> dict:
    """İnceleme kaydını yazar; hash'leri dosyalardan BURADA hesaplar (ajan hash yazmaz)."""
    kalite = quality_counts(bulgular)
    if kalite is None:
        raise ValueError("bulgular: kritik/yuksek/orta/dusuk negatif olmayan tam sayı olmalı")
    if not isinstance(kaynak_dosyalari, list) or not kaynak_dosyalari:
        raise ValueError("kaynak_dosyalari boş olamaz")
    base = Path(project_dir)
    hashes = set()
    for f in kaynak_dosyalari:
        p = Path(f) if Path(f).is_absolute() else base / f
        if not p.is_file():
            raise ValueError(f"kaynak dosyası yok: {f}")
        hashes.add(file_hash(p))
    rec = {
        "nesne": ad.upper(),
        "tip": tip.upper(),
        "kaynak_sha256": sorted(hashes),
        "kaynak_dosyalari": [str(f) for f in kaynak_dosyalari],
        "skill": skill,
        "tarih": (now or datetime.now(timezone.utc)).isoformat(),
        "bulgular": kalite,
        "rapor": rapor,
    }
    path = review_path(project_dir, tip, ad)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(rec, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, path)
    return rec


def zip_objects(zip_path) -> tuple[list[dict], str]:
    """abapGit ZIP'i → ([{ad, tip, kaynak_sha256}], zip_sha256).

    Nesne anahtarı dosya adından: `zcl_a.clas.locals_imp.abap` → (CLAS, ZCL_A),
    `#abc#cl_x.clas.abap` → (CLAS, /ABC/CL_X). ZIP hash'i TÜM girdilerin
    (ad, normalize hash) sıralı listesinden: girdi sırası ve satır sonu değişmez,
    XML dahil herhangi bir içerik değişirse değişir.
    """
    groups: dict[tuple[str, str], set[str]] = {}
    entries = []
    with zipfile.ZipFile(zip_path) as z:
        for info in z.infolist():
            if info.is_dir():
                continue
            h = src_hash(z.read(info))
            entries.append((info.filename, h))
            base = info.filename.rsplit("/", 1)[-1]
            if not base.lower().endswith(ZIP_SOURCE_EXT):
                continue
            parts = base.split(".")
            if len(parts) < 3:
                continue
            key = (parts[1].upper(), parts[0].upper().replace("#", "/"))
            groups.setdefault(key, set()).add(h)
    digest = hashlib.sha256()
    for name, h in sorted(entries):
        digest.update(f"{name}\0{h}\n".encode("utf-8"))
    objs = [{"ad": ad, "tip": tip, "kaynak_sha256": sorted(hs)} for (tip, ad), hs in sorted(groups.items())]
    return objs, digest.hexdigest()


def diff(old: str | None, new: str) -> tuple[str, bool]:
    """SAP'taki aktif sürüm ↔ gönderilecek. (metin, kırpıldı_mı). old None → yeni nesne."""
    if old is None:
        return "", False
    a = old.replace("\r\n", "\n").splitlines()
    b = new.replace("\r\n", "\n").splitlines()
    lines = list(difflib.unified_diff(a, b, "SAP (aktif)", "gönderilecek", lineterm="", n=3))
    kirpildi = False
    if len(lines) > MAX_DIFF_LINES:
        lines = lines[:MAX_DIFF_LINES]
        kirpildi = True
    text = "\n".join(lines)
    if len(text) > MAX_DIFF_CHARS:
        text = text[:MAX_DIFF_CHARS]
        kirpildi = True
    return text, kirpildi
