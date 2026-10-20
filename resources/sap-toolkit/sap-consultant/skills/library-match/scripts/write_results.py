#!/usr/bin/env python3
"""Skorlanan satirlari sonuc Excel'ine ekler ve sozlesmeyi ZORLAR.

NEDEN BIR SCRIPT
  Bu dosya, kaynak dokumandaki uc ayri "yalvarma" blogunun yerini aliyor.
  Hepsi ayni sekilde basarisiz oluyordu: kural metinde duruyordu, dolayisiyla
  uyulup uyulmadigini kimse olcmuyordu.

  1. "Her satir KESINLIKLE 15 elemanli olmalidir (COL_COUNT = 15)" -> assert.
  2. "Eslesme Orani'na 'Create' gibi metin yazmak YASAKTIR" -> tip kontrolu.
  3. "HER BATCH MUTLAKA OKUNMALI ... 420 kaydi toplu HARD GATE yazmak YANLIS"
     -> --batch verildiginde, batch'teki her G anahtarinin satirlarda gercekten
     karsiligi var mi diye SAYILIR. Yoksa yazma reddedilir.

  Ucuncusu onemli olan. Bir modelin batch'i okumadan gecmesini metinle
  engelleyemezsin; ama okumadan gecerse ortaya cikan eksigi sayabilirsin.

CIKTI ASCII
  Konsol cp1252. Veri UTF-8 Turkce.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# The console on a Turkish Windows machine is cp1254. Anything printed that is
# not plain ASCII kills the process there -- including text this file never sees
# in its own source, because a Turkish path or object name arrives through a
# variable. The work is finished by then, so the output lands on disk and the
# consultant still reads a traceback and reports the tool as broken.
# See scripts/test_skill_scripts.py for the three times this was found and
# locally fixed before it was made an invariant.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

try:
    import openpyxl
except ImportError:                                        # pragma: no cover
    sys.exit("openpyxl gerekli: pip install -r plugins/sap-consultant/requirements.txt")

COL_COUNT = 15
SKOR_IDX = 13          # "Eslesme Orani (%)" -- daima sayi
KEY_IDX = 0            # "Key (G)"

HERE = Path(__file__).resolve().parent
# office-tools/lib, beside this plugin in the catalog (cross_plugin_deps declares it)
sys.path.insert(0, str(HERE.parents[3] / "office-tools" / "lib"))
# NTT Studio uyarlamasi: kurulu agacta skill .axet-code/skills/<ad>/ altinda,
# office-tools/lib ise .axet-code/lib'e kuruluyor (SHARED_ASSETS); yukaridaki
# yol orada yok. Bu satir o lib'i buluyor.
sys.path.insert(0, str(HERE.joinpath("..", "..", "..", "lib")))

# Kolon genislikleri (karakter) ve hangi kolonlar uzun metin: ekranda okunur
# olsun diye. 2026-09-29'a kadar dosya hic bicimlenmiyordu -- baslik rengi yok,
# her kolon 8 karakter, metin kesik, yazdirma ayari yok.
WIDTHS = [12, 30, 40, 12, 12, 10, 30, 40, 16, 10, 20, 20, 22, 11, 45]


def mevcut_satirlar(ws) -> tuple[list, list]:
    """Basligi ve veri satirlarini okur -- dosya ister prepare.py'nin yalin
    halinde (baslik 1. satirda) ister bicimli halinde (baslik blogunun altinda)
    olsun: baslik, ilk hucresi 'Key (G)' olan satirdir."""
    rows = [list(r) for r in ws.iter_rows(values_only=True)]
    for i, row in enumerate(rows):
        if row and str(row[0] or "").strip() == "Key (G)":
            baslik = [str(c or "") for c in row[:COL_COUNT]]
            veri = [list(r[:COL_COUNT]) for r in rows[i + 1:]
                    if r and any(c not in (None, "") for c in r[:COL_COUNT])]
            return baslik, veri
    sys.exit("Sonuc dosyasinda 'Key (G)' baslik satiri bulunamadi. "
             "prepare.py'yi yeniden calistir.")


def yaz(out: Path, proje: str, baslik: list, veri: list) -> None:
    """Sonuc dosyasini NTT is kitabi temasiyla (lib/xlsx_theme.py) yazar:
    baslik blogu, filtrelenen Excel tablosu, sabit baslik, A4 yazdirma; skor
    kolonunda bir cubuk. Her yazimda bastan kurulur, satirlar ayni kalir."""
    import xlsx_theme as xt
    from openpyxl.formatting.rule import DataBarRule
    from openpyxl.styles import Alignment
    from openpyxl.utils import get_column_letter

    meta = {"title": f"Kütüphane Eşleştirmesi — {proje}", "project": proje}
    wb = xt.new_workbook(meta)
    cols = [{"key": str(i), "header": h, "width": WIDTHS[i] if i < len(WIDTHS) else 16}
            for i, h in enumerate(baslik)]
    satir = [{str(i): ("" if v is None else v) for i, v in enumerate(r)} for r in veri]
    ws = xt.add_table_sheet(
        wb, "Analiz Sonuçları", cols, satir, meta=meta, freeze_cols=1,
        table_name="Analiz",
        legend="(G) talep listesi, (K) kütüphane. Eşleşme oranı 0–100; 0 = kütüphanede "
               "karşılığı yok. Her kolonda filtre ve sıralama var.")
    ilk, son = xt.HEADER_ROW + 1, xt.HEADER_ROW + max(len(satir), 1)
    skor = get_column_letter(SKOR_IDX + 1)
    for rr in range(ilk, son + 1):
        ws[f"{skor}{rr}"].alignment = Alignment(horizontal="right", vertical="top")
    ws.conditional_formatting.add(
        f"{skor}{ilk}:{skor}{son}",
        DataBarRule(start_type="num", start_value=0, end_type="num", end_value=100,
                    color="6CACE4", showValue=True))
    wb.save(out)


def dogrula(satirlar: list) -> list:
    """Uzunluk ve tip sozlesmesini uygular; ihlali satir numarasiyla bildirir."""
    temiz = []
    for n, r in enumerate(satirlar, 1):
        if not isinstance(r, list):
            sys.exit(f"satir {n}: liste bekleniyordu, {type(r).__name__} geldi")
        if len(r) != COL_COUNT:
            sys.exit(f"satir {n} ({r[KEY_IDX] if r else '?'}): {len(r)} sutun, "
                     f"{COL_COUNT} olmali.\n  {r}")
        r = list(r)
        ham = r[SKOR_IDX]
        try:
            r[SKOR_IDX] = int(float(str(ham).strip().rstrip("%") or 0))
        except (TypeError, ValueError):
            sys.exit(f"satir {n} ({r[KEY_IDX]}): 'Eslesme Orani' sayi olmali, "
                     f"'{ham}' geldi. Surec/nesne adi bu sutuna yazilmaz.")
        if not 0 <= r[SKOR_IDX] <= 100:
            sys.exit(f"satir {n} ({r[KEY_IDX]}): skor {r[SKOR_IDX]}, 0-100 disinda.")
        r[-1] = "" if r[-1] is None else str(r[-1])
        temiz.append(r)
    return temiz


def batch_kapsandi_mi(batch_yolu: Path, satirlar: list) -> None:
    """Batch'teki her G kaydinin en az bir cikti satiri var mi?

    Bir G birden fazla K ile eslesebilir (coklu eslesme kurali), yani satir sayisi
    G sayisindan fazla olabilir -- kontrol edilen sey sayilarin esitligi degil,
    hicbir G'nin ATLANMAMIS olmasi.
    """
    batch = json.loads(batch_yolu.read_text(encoding="utf-8"))
    # Batch sekli: {"modul", "k_candidates" (bir kez), "g_records"}. Adaylar her G
    # kaydinin yaninda tekrarlanmiyor -- bkz. prepare.py'deki gerekce.
    bekleniyor = {str(g.get("Key", "")).strip() for g in batch["g_records"]}
    yazilan = {str(r[KEY_IDX]).strip() for r in satirlar}
    eksik = sorted(bekleniyor - yazilan)
    if eksik:
        sys.exit(f"\n{batch_yolu.name}: {len(eksik)} G kaydinin hic satiri yok.\n"
                 f"  eksik: {', '.join(eksik[:10])}"
                 f"{' ...' if len(eksik) > 10 else ''}\n"
                 f"  Her G kaydi icin bir sonuc satiri gerekir -- eslesme "
                 f"bulunmadiysa da ('Karsiligi Yok', skor 0). Batch'i okuyup "
                 f"eksikleri tamamla, sonra tekrar calistir.")
    fazla = sorted(yazilan - bekleniyor)
    if fazla:
        sys.exit(f"\n{batch_yolu.name}: bu batch'te olmayan {len(fazla)} anahtar "
                 f"yazilmis: {', '.join(fazla[:10])}\n"
                 f"  Yanlis batch dosyasi verilmis olabilir.")


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description="Analiz satirlarini sonuc Excel'ine ekler.")
    ap.add_argument("--project", required=True, help="prepare.py ile ayni proje adi")
    ap.add_argument("--root", default=".")
    ap.add_argument("--rows", help="Satirlarin JSON dosyasi (liste of liste)")
    ap.add_argument("--batch", help="Bu satirlarin geldigi batch dosyasi; "
                                    "verilirse kapsama kontrolu yapilir")
    ap.add_argument("--finalize", action="store_true",
                    help="Elenen kayitlari (batches/eliminated.json) ekle ve ozet ver")
    a = ap.parse_args(argv[1:])

    kok = Path(a.root).resolve()
    out = kok / "Sonuc" / a.project / "Analiz_Sonuclari.xlsx"
    if not out.is_file():
        sys.exit(f"{out} yok. Once prepare.py --project \"{a.project}\" calistir.")

    if not a.rows and not a.finalize:
        sys.exit("--rows ya da --finalize ver.")

    satirlar: list = []
    if a.rows:
        satirlar = dogrula(json.loads(Path(a.rows).read_text(encoding="utf-8")))
        if a.batch:
            batch_kapsandi_mi(kok / a.batch if not Path(a.batch).is_absolute()
                              else Path(a.batch), satirlar)
    if a.finalize:
        elim = kok / "batches" / "eliminated.json"
        if elim.is_file():
            satirlar += dogrula(json.loads(elim.read_text(encoding="utf-8")))

    baslik, veri = mevcut_satirlar(openpyxl.load_workbook(out).active)
    veri += satirlar
    try:
        yaz(out, a.project, baslik, veri)
    except PermissionError:
        sys.exit(f"\n{out} yazilamadi -- Excel'de acik olabilir. Kapat ve tekrar dene.")

    print(f"{len(satirlar)} satir eklendi. Toplam {len(veri)} analiz satiri.")
    if a.finalize:
        skorlar = [r[SKOR_IDX] for r in veri]
        eslesen = sum(1 for s in skorlar if isinstance(s, (int, float)) and s > 0)
        print(f"  eslesen (skor > 0) : {eslesen}")
        print(f"  karsiligi yok / elenen : {len(skorlar) - eslesen}")
        print(f"  dosya: {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
