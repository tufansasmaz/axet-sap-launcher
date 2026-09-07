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

    wb = openpyxl.load_workbook(out)
    ws = wb.active
    for r in satirlar:
        ws.append(r)
    try:
        wb.save(out)
    except PermissionError:
        sys.exit(f"\n{out} yazilamadi -- Excel'de acik olabilir. Kapat ve tekrar dene.")

    print(f"{len(satirlar)} satir eklendi. Toplam {ws.max_row - 1} analiz satiri.")
    if a.finalize:
        skorlar = [ws.cell(r, SKOR_IDX + 1).value for r in range(2, ws.max_row + 1)]
        eslesen = sum(1 for s in skorlar if isinstance(s, (int, float)) and s > 0)
        print(f"  eslesen (skor > 0) : {eslesen}")
        print(f"  karsiligi yok / elenen : {len(skorlar) - eslesen}")
        print(f"  dosya: {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
