#!/usr/bin/env python3
"""Kutuphane (K) ve yeni gelistirme (G) listelerini analize hazirlar.

NEDEN BIR SCRIPT
  Bu adimin tamami deterministik: bos aciklama bos aciklamadir, field-extension
  keyword'u ya vardir ya yoktur, modul ya kutuphanede gecer ya gecmez. Bunu
  duzyaziyla tarif edip her calistirmada modele yeniden yazdirmak, ayni girdiye
  farkli cevap verme ihtimali satin almaktir -- karsiliginda hicbir sey vermeden.
  LLM'in isi Hard Gate ve skor; eleme degil.

  Bu dosyanin varligi ayni zamanda SKILL.md'den otuz satirlik bir "once SOR"
  blogunu siliyor. Proje adi ve mod artik ZORUNLU ARGUMAN: script onlarsiz
  calismiyor, dolayisiyla klasor adindan tahmin edilecek bir sey de kalmiyor.

BASLIKLARI DOGRULAR, VARSAYMAZ
  Iki Excel'in sutun adlari elle bakimda ve her musteride biraz farkli. Script
  bekledigi basliklari arar, bulamazsa DOSYADAKI GERCEK BASLIKLARI basip durur.
  Sessizce yanlis sutundan okuyup makul gorunen bir sonuc uretmek, calismamaktan
  kotudur: kimse fark etmez.

CIKTI ASCII
  Konsol cp1252 (bkz. CLAUDE.md/Environment). Veri UTF-8 Turkce; sadece bu
  script'in transkripti duz.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
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

# --- sutun sozlesmesi -------------------------------------------------------
#
# (kanonik_ad, zorunlu_mu, [kabul edilen yazimlar]). Zorunlu olmayan bir sutun
# yoksa None okunur; zorunlu olan yoksa script durur ve dosyadaki gercek
# basliklari basar.
#
# ALIAS LISTESI NEDEN VAR
#   Bu skill'in tarifini yazan dokumandaki sutun adlari, gercek Helix kutuphane
#   dosyasinin sutun adlariyla buyuk olcude TUTMUYORDU: dokuman "Gelistirme
#   Aciklamasi" diyor, dosya "Geliştirme Açıklama"; dokuman "Bulundugu Sistem"
#   diyor, dosya "Kütüphane Sistemi" (ve ayri bir "Sistem" sutunu var, ama o
#   musteri adi tutuyor -- ona baglanmak sessizce yanlis olurdu). "Bulundugu
#   Client", "Fiori" ve "Kopyalanan Sistem" ise hic yok.
#
#   Ders su: her musterinin kutuphane dosyasi biraz farkli sekilli, ve tek bir
#   dogru yazim yok. Alias listesi bu varyasyonu konfigurasyon gerektirmeden
#   karsilar; karsilayamadiginda da tahmin etmez, durur.
G_COLS = [
    ("Key", True, ["Key", "Anahtar", "Talep No"]),
    ("Summary", True, ["Summary", "Ozet", "Gelistirme Tanimi", "Baslik"]),
    ("Description", True, ["Description", "Aciklama", "Gelistirme Aciklama",
                           "Gelistirme Aciklamasi"]),
    ("Sorumlu Ana Modul", True, ["Sorumlu Ana Modul", "Main Responsible Modul",
                                 "Modul"]),
    ("Labels", False, ["Labels", "Etiketler"]),
    ("Gelistirme Tipi", False, ["Gelistirme Tipi", "WRICEF", "Tip", "Tur"]),
]

K_COLS = [
    ("Modul", True, ["Modul", "Sorumlu Ana Modul"]),
    ("Gelistirme Tanimi", True, ["Gelistirme Tanimi", "Tanim", "Baslik",
                                 "Summary"]),
    # Helix dosyasinda "Açıklama", dokumanda "Açıklaması" idi. Tek harf, ve
    # bu tek harf zorunlu sutunu bulunamaz yapiyordu.
    ("Gelistirme Aciklamasi", True, ["Gelistirme Aciklamasi",
                                     "Gelistirme Aciklama", "Aciklama",
                                     "Description"]),
    # Gelistirmenin DURDUGU kutuphane sistemi (NP4/NS4/NR4). Helix'teki "Sistem"
    # sutunu DEGIL -- o musteri/proje adi tutuyor.
    ("Bulundugu Sistem", False, ["Kutuphane Sistemi", "Bulundugu Sistem",
                                 "Library System"]),
    ("Islem Kodu", False, ["Islem Kodu", "TCODE", "Transaction"]),
    ("Program Adi", False, ["Program Adi", "Sistem Program Kodu",
                            "Kutuphane Sistem Program Kodu", "Program"]),
    ("Gelistirme Paketi", False, ["Gelistirme Paketi", "Paket",
                                  "Sistem Gelistirme Kodu"]),
    # Iptal edilmis bir kutuphane kaydi yeniden kullanim adayi degildir; asagida
    # aday listesinden dusuruluyor.
    ("Kopyalama Durumu", False, ["Kopyalama Durumu", "Durum", "Status"]),
    ("Endustri", False, ["Endustri", "Sektor", "Industry"]),
    ("Tur", False, ["Tur", "Kutuphane Turu"]),
]

# `Kopyalama Durumu` bu degerlerden birindeyse K kaydi aday havuzuna girmez.
# Gercek Helix dosyasinda 127 kayittan 4'u boyle. Iptal edilmis bir gelistirmeyi
# "bunun karsiligi kutuphanede var" diye sunmak, olmayan bir seyi vaat etmektir.
K_ELENEN_DURUM = {"iptal", "iptal edildi", "cancelled"}

# Ciktinin sutun sirasi. Analiz satirlari bu sirayla yazilir ve write_results.py
# uzunlugu bunun karsisinda dogrular -- eskiden bu is SKILL.md'de "her satir
# KESINLIKLE 15 elemanli olmalidir" diye bagirilarak yapiliyordu.
OUT_COLS = [
    "Key (G)", "Summary (G)", "Description (G)", "Main Responsible Modul (G)",
    "Gelistirme Tipi (G)", "Modul (K)", "Gelistirme Tanimi (K)",
    "Gelistirme Aciklamasi (K)", "Kutuphane Sistem Program Kodu (K)",
    "Bulundugu Sistem (K)", "SAP Ana Is Nesnesi", "SAP Alt Is Nesnesi",
    "SAP Is Sureci", "Eslesme Orani (%)", "Benzerlik Notu / Yorum",
]

# Ayni kapiya cikan iki kural (bkz. HARD_GATE.md §0). Burada tutulmalari
# bilincli: bunlar duz metin taramasi, SAP bilgisi gerektirmiyor.
FIELD_EXT = [
    "ek alan", "additional field", "custom field", "append structure",
    "ci include", "screen enhancement", "field extension", "z alan",
    "alan ekleme", "kolon ekleme", "dynpro", "selection screen degisikligi",
    "layout degisikligi",
]

BATCH_SIZE = 10        # bir batch'teki en fazla G kaydi

# Kitle birlikte gelen kutuphane kopyasi. Danısman hicbir sey indirmek zorunda
# degil; kendi .xlsx'ini koyarsa o kazanir (bkz. kutuphane_yukle).
PAKETLI = Path(__file__).resolve().parent.parent / "references" / "library.jsonl"

# JSONL'in kisa anahtarlari <-> sozlesmenin kanonik adlari. TEK tanim burada;
# scripts/sync_library.py bunu ice aktarip tersine ceviriyor, cunku ayni eslemeyi
# iki yerde yazmak onlarin ayrismasinin normal yoludur.
JSONL_ALAN = {
    "tanim": "Gelistirme Tanimi",
    "aciklama": "Gelistirme Aciklamasi",
    "modul": "Modul",
    "tcode": "Islem Kodu",
    "program": "Program Adi",
    "paket": "Gelistirme Paketi",
    "sistem": "Bulundugu Sistem",
    "durum": "Kopyalama Durumu",
    "tur": "Tur",
    "sektor": "Endustri",
}


def sadelestir(s: object) -> str:
    """Baslik eslestirmek icin: Turkce harf, buyuk/kucuk ve bosluk farkini duser.

    Ayni dosyanin ayni sutunu bir yerde 'Geliştirme Tanımı', baska yerde
    'Gelistirme Tanimi' yazilabiliyor -- kaynak dokumanin kendi ic yollari bile
    tutarsizdi. Boyle bir farkin analizi durdurmasi anlamsiz.
    """
    if s is None:
        return ""
    t = unicodedata.normalize("NFKD", str(s))
    t = "".join(c for c in t if not unicodedata.combining(c))
    t = (t.replace("ı", "i").replace("İ", "I")
          .replace("ş", "s").replace("Ş", "S")
          .replace("ğ", "g").replace("Ğ", "G"))
    return re.sub(r"[^a-z0-9]+", " ", t.lower()).strip()


def duz(s: object) -> str:
    """Turkce metni cp1252 konsolunda OKUNABILIR ASCII'ye cevirir.

    encode('ascii','replace') degil: o 'Geliştirme' -> 'Geli?tirme' yapiyor ve
    hata mesajinin tek amaci -- insanin dosyadaki gercek basliklari okuyup
    sozlesmeyi duzeltmesi -- bozuluyor. Harf harf cevriliyor.
    """
    t = str(s)
    for a, b in (("ı", "i"), ("İ", "I"), ("ş", "s"), ("Ş", "S"), ("ğ", "g"),
                 ("Ğ", "G"), ("ç", "c"), ("Ç", "C"), ("ö", "o"), ("Ö", "O"),
                 ("ü", "u"), ("Ü", "U")):
        t = t.replace(a, b)
    return t.encode("ascii", "replace").decode("ascii")


def basliklari_coz(ws, sozlesme, etiket: str) -> dict[str, int]:
    """Ilk satiri okuyup kanonik ad -> sutun indeksi haritasi kurar.

    Her kanonik alan icin kabul edilen yazimlar sirayla denenir; ilk tutan
    kazanir, yani alias listesinin SIRASI onceliktir.
    """
    ham = [c.value for c in next(ws.iter_rows(min_row=1, max_row=1))]
    var = {sadelestir(h): i for i, h in enumerate(ham) if h is not None}
    harita, eksik = {}, []
    for ad, zorunlu, aliaslar in sozlesme:
        i = next((var[sadelestir(al)] for al in aliaslar if sadelestir(al) in var),
                 None)
        if i is None:
            if zorunlu:
                eksik.append(f"{ad} (kabul edilenler: {', '.join(aliaslar)})")
        else:
            harita[ad] = i
    if eksik:
        gercek = ", ".join(duz(h) for h in ham if h is not None)
        sys.exit(f"\n{etiket}: su zorunlu sutun(lar) bulunamadi:\n  - "
                 + "\n  - ".join(duz(e) for e in eksik)
                 + f"\n\n  dosyadaki basliklar: {gercek}\n"
                 f"  Sutun adini duzelt, ya da bu yazimi prepare.py'deki alias "
                 f"listesine ekle. Script tahmin etmez.")
    return harita


def satirlari_oku(ws, harita: dict[str, int]) -> list[dict]:
    out = []
    for satir in ws.iter_rows(min_row=2, values_only=True):
        if all(h is None or str(h).strip() == "" for h in satir):
            continue
        k = {}
        for ad, i in harita.items():
            v = satir[i] if i < len(satir) else None
            k[ad] = "" if v is None else str(v).strip()
        out.append(k)
    return out


def program_kodu(k: dict) -> str:
    """K kaydinin gosterilecek kodu: uc alan, ilk dolu olan kazanir.

    Sira Helix dosyasinin doluluk oranlarina gore: Islem Kodu 126/127,
    Program Adi 124/127, Gelistirme Paketi 126/127. Islem kodu one aliniyor
    cunku danismanin "bu zaten var" dedikten sonra bakacagi sey o -- paket adi
    kutuphanede nerede durdugunu soyler, tcode ise nasil calistirildigini.
    """
    for alan in ("Islem Kodu", "Program Adi", "Gelistirme Paketi"):
        v = (k.get(alan) or "").strip()
        if v:
            return v
    return ""


def paketli_kutuphane() -> tuple[list[dict], str]:
    """Kitle gelen library.jsonl. Kayitlari Excel yolununkiyle ayni sekle cevirir.

    Yasi da donduruluyor ve her calistirmada BASILIYOR. Bir kopyanin bayatlamasi
    engellenemez; engellenebilecek olan, bayat oldugunun fark edilmemesi.
    """
    import json as _json
    from datetime import date, datetime
    satirlar = [s for s in PAKETLI.read_text(encoding="utf-8").splitlines() if s.strip()]
    meta = _json.loads(satirlar[0]).get("_meta", {})
    kayitlar = []
    for s in satirlar[1:]:
        ham = _json.loads(s)
        k = {kanonik: ham.get(kisa, "") for kisa, kanonik in JSONL_ALAN.items()}
        # Alternatif tcode'lar kimlik icin degerli ama sozlesmede alani yok;
        # bos gecen ana tcode'un yerine geciyorlar.
        if not k["Islem Kodu"] and ham.get("diger_tcode"):
            k["Islem Kodu"] = ham["diger_tcode"][0]
        kayitlar.append(k)
    try:
        yas = (date.today() - datetime.fromisoformat(meta["tarih"]).date()).days
        yas_str = f", {meta['tarih']} ({yas} gun once)"
        if yas > 120:
            yas_str += "  <- BAYAT olabilir, scripts/sync_library.py ile tazele"
    except Exception:
        yas_str = ""
    return kayitlar, f"kitle gelen kopya: {len(kayitlar)} kayit{yas_str}"


def on_eleme(g: dict, k_moduller: set[str]) -> str | None:
    """Elenme sebebini dondurur, elenmiyorsa None. Sira HARD_GATE.md §0'daki sira."""
    aciklama = (g.get("Description") or "").strip()
    if not aciklama:
        return "ERKEN ELIME: Bos aciklama"
    duz = sadelestir(aciklama)
    for kw in FIELD_EXT:
        if sadelestir(kw) in duz:
            return "ERKEN ELIME: Field Extension"
    if sadelestir(g.get("Sorumlu Ana Modul")) not in k_moduller:
        return "HARD GATE: Modul eslesmedi"
    return None


def bos_satir(g: dict, sebep: str) -> list:
    """Elenen bir G kaydinin cikti satiri. Skor daima sayi -- metin degil."""
    return [g.get("Key", ""), g.get("Summary", ""), g.get("Description", ""),
            g.get("Sorumlu Ana Modul", ""), g.get("Gelistirme Tipi", ""),
            "Karsiligi Yok", "Karsiligi Yok", "", "", "", "", "", "", 0, sebep]


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(
        description="Kutuphane/gelistirme listelerini analiz batch'lerine hazirlar.")
    # Zorunlu. Bu iki satir, SKILL.md'deki otuz satirlik "once SOR" blogunun yerini
    # aliyor: tahmin edilebilecek bir sey yok, cunku argumansiz calismiyor.
    ap.add_argument("--project", required=True,
                    help="Proje adi. Sonuc/<proje>/ klasorunu belirler. ZORUNLU.")
    ap.add_argument("--root", default=".", help="Calisma klasoru (varsayilan: .)")
    ap.add_argument("--g", help="G listesi .xlsx (varsayilan: Gelistirme Listesi/ altinda tek dosya)")
    ap.add_argument("--k", help="K listesi .xlsx (varsayilan: Kutuphane Listesi/ altinda tek dosya)")
    a = ap.parse_args(argv[1:])

    kok = Path(a.root).resolve()

    def tek_dosya(verilen: str | None, klasor: str) -> Path:
        if verilen:
            p = Path(verilen)
            return p if p.is_absolute() else kok / p
        d = kok / klasor
        if not d.is_dir():
            sys.exit(f"'{klasor}' klasoru yok ({d}). --g/--k ile yol ver.")
        bulunan = [f for f in sorted(d.glob("*.xls*")) if not f.name.startswith("~$")]
        if len(bulunan) != 1:
            sys.exit(f"'{klasor}' altinda tam olarak bir .xlsx bekleniyor, "
                     f"{len(bulunan)} bulundu: {[f.name for f in bulunan]}")
        return bulunan[0]

    g_yol = tek_dosya(a.g, "Gelistirme Listesi")
    # K icin YEREL DOSYA ONCELIKLI. Kendi kutuphanesi olan ya da SharePoint'ten
    # daha taze bir kopya indirmis bir proje engellenmemeli; kimse bir sey
    # koymadiysa da kitin kendi kopyasi devreye giriyor ve is durmuyor.
    k_yerel = None
    if a.k or (kok / "Kutuphane Listesi").is_dir():
        k_yerel = tek_dosya(a.k, "Kutuphane Listesi")
    print(f"proje  : {a.project}")
    print(f"G      : {duz(g_yol.name)}")

    # Her calistirmada SIFIRDAN okunur. Ara JSON'lar cache degil cikti: eski bir
    # g_data.json'u okumak, kullanicinin az once duzelttigi Excel'i gormemek demek.
    g_ws = openpyxl.load_workbook(g_yol, read_only=True, data_only=True).active
    g_kayit = satirlari_oku(g_ws, basliklari_coz(g_ws, G_COLS, "G listesi"))
    if k_yerel is not None:
        k_ws = openpyxl.load_workbook(k_yerel, read_only=True, data_only=True).active
        k_ham = satirlari_oku(k_ws, basliklari_coz(k_ws, K_COLS, "K listesi"))
        k_kaynak = f"yerel dosya: {duz(k_yerel.name)}"
    elif PAKETLI.is_file():
        k_ham, k_kaynak = paketli_kutuphane()
    else:
        sys.exit("Kutuphane bulunamadi: ne 'Kutuphane Listesi/' klasoru var, ne de\n"
                 f"  kitle gelen kopya ({PAKETLI.name}). --k ile yol ver.")
    print(f"K      : {k_kaynak}")
    for k in k_ham:
        k["__program_kodu"] = program_kodu(k)
    # Iptal edilmis kayitlar aday havuzuna girmez. Bu G tarafindaki eleme DEGIL:
    # G kaydi analize devam eder, sadece bu aday yok sayilir.
    k_kayit = [k for k in k_ham
               if sadelestir(k.get("Kopyalama Durumu")) not in
               {sadelestir(d) for d in K_ELENEN_DURUM}]
    iptal = len(k_ham) - len(k_kayit)
    print(f"okundu : {len(g_kayit)} G kaydi, {len(k_ham)} K kaydi"
          + (f" ({iptal} tanesi iptal, aday degil)" if iptal else ""))

    k_modul: dict[str, list[dict]] = {}
    for k in k_kayit:
        k_modul.setdefault(sadelestir(k.get("Modul")), []).append(k)

    elenen, gecen = [], []
    sebep_sayim: dict[str, int] = {}
    for g in g_kayit:
        sebep = on_eleme(g, set(k_modul))
        if sebep:
            elenen.append(bos_satir(g, sebep))
            sebep_sayim[sebep] = sebep_sayim.get(sebep, 0) + 1
        else:
            gecen.append(g)

    cikti = kok / "Sonuc" / a.project
    batch_dir = kok / "batches"
    for d in (cikti, batch_dir):
        d.mkdir(parents=True, exist_ok=True)
    for eski in batch_dir.glob("batch_*.json"):
        eski.unlink()

    # Batch'ler MODULE gore bolunuyor, sonra modul icinde parcalaniyor. Ilk surum
    # G kayitlarini siraya gore boluyor ve her G'nin YANINA kendi aday listesini
    # kopyaliyordu; olculdu: gercek Helix kutuphanesinde FI'nin 49 adayi var, yani
    # 10 G'lik bir batch ayni 49 kaydi 10 kez tasiyor ve dosya ~100K token'a
    # cikiyordu. Adaylar batch basina BIR KEZ yazilinca ayni is 10 kat ucuza
    # geliyor -- ve batch'in anlami da duzeliyor: "su FI talepleri, FI kutuphanesi
    # karsisinda".
    batch_sayi = 0
    modul_sirasi: dict[str, list[dict]] = {}
    for g in gecen:
        modul_sirasi.setdefault(sadelestir(g.get("Sorumlu Ana Modul")), []).append(g)
    for mod, g_listesi in modul_sirasi.items():
        adaylar = k_modul[mod]
        for i in range(0, len(g_listesi), BATCH_SIZE):
            batch_sayi += 1
            govde = {
                "modul": g_listesi[i].get("Sorumlu Ana Modul", ""),
                "k_candidates": adaylar,
                "g_records": g_listesi[i:i + BATCH_SIZE],
            }
            (batch_dir / f"batch_{batch_sayi:03d}.json").write_text(
                json.dumps(govde, ensure_ascii=False, indent=1), encoding="utf-8")
    (batch_dir / "eliminated.json").write_text(
        json.dumps(elenen, ensure_ascii=False, indent=1), encoding="utf-8")

    # Sonuc dosyasi her calistirmada sifirlanir: yarim kalmis bir onceki kosunun
    # satirlarinin altina yenilerini eklemek, iki analizin karisimini tek dosyada
    # birakir ve hangisinin hangisi oldugu anlasilmaz.
    out = cikti / "Analiz_Sonuclari.xlsx"
    wb = openpyxl.Workbook()
    wb.active.append(OUT_COLS)
    try:
        wb.save(out)
    except PermissionError:
        sys.exit(f"\n{out} yazilamadi -- dosya Excel'de acik olabilir.\n"
                 f"  Kapat ve tekrar calistir.")

    print(f"\nelenen : {len(elenen)}")
    for s, n in sorted(sebep_sayim.items()):
        print(f"         {n:5}  {s}")
    print(f"batch  : {batch_sayi} dosya ({len(gecen)} G kaydi, batch basina "
          f"en fazla {BATCH_SIZE})")
    print(f"cikti  : {out.relative_to(kok)} ({len(OUT_COLS)} sutunlu baslik yazildi)")
    if batch_sayi:
        print(f"\nsirada : batches/batch_001.json oku ve HARD_GATE.md + SCORING.md "
              f"ile degerlendir.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
