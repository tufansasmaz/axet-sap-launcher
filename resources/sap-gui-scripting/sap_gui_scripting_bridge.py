"""
sap_gui_scripting_bridge.py — aXet SAP Launcher "SAP GUI Scripting" ekranı
için yerel HTTP+JSON köprüsü.

Amaç: Electron main process COM otomasyonunu doğrudan yapamaz (Node.js'te
"winax" gibi native COM köprüleri node-gyp/Visual Studio derlemesi gerektirir
— bu proje zaten RFC bridge için aynı sebeple Python+pywin32'ye yöneldi, bkz.
PROJE-BILGI.md "pyrfc/SAP NW RFC SDK — Windows'ta gerçek kurulum sorunları").
Bu script gömülü Python runtime'ı (resources/guiscript-runtime; pywin32 +
Pillow kurulu) ile çalıştırılır ve `app-electron/main/sapGuiScriptManager.ts`
tarafından spawn edilir — `adt_rfc_bridge.py`/`adt_readonly_server.py` ile
BİREBİR AYNI mimari desen (health endpoint, launcher tarafından otomatik
başlatma/durdurma).

ÖNEMLİ — SAP GUI Scripting'in KENDİ doğası: bu COM arayüzü sadece KENDİ
makinenizde ZATEN AÇIK olan bir SAP Logon/SAP GUI penceresine bağlanır
(win32com.client.GetObject("SAPGUI")) — .conn_adt/ADT kimlik doğrulamasıyla
HİÇ ilgisi yok, bu yüzden bu bridge `connectToSystem()` akışına hiç
bağlanmadı, tamamen bağımsız bir Activity/IPC namespace'i olarak yaşıyor.

İKİ AYRI AÇMA ANAHTARI var ve ikisi de gerekli:
  1) SUNUCU tarafı: `sapgui/user_scripting = TRUE` (RZ11 ile dinamik olarak,
     yeniden başlatma gerektirmeden; kalıcı olması için RZ10 profili).
  2) İSTEMCİ tarafı: SAP Logon → Options (Alt+F12) → Accessibility & Scripting
     → Scripting → "Enable scripting" + iki "Notify" kutusu kapalı.
Değişiklik YENİ oturumlarda geçerli olur — mevcut oturumdan çıkıp tekrar gir.

TEŞHİS (/preflight): "neden çalışmıyor" sorusunu TAHMİN ETMEK YERİNE ÖLÇER.
Win32 seviyesinde `SAP_FRONTEND_SESSION` sınıfındaki pencereleri sayar, ayrı
olarak scripting engine'in oturum sayısını okur ve İKİSİNİ KARŞILAŞTIRIR:
ekran penceresi var ama scripting oturumu 0 ise teşhis kesindir — scripting
kapalı. Bu uç nokta BİLEREK `get_application()` guard'ının DIŞINDA: scripting
tamamen kapalıyken de cevap vermek zorunda, zaten asıl işi bu.

Test durumu: Bu script bu geliştirme ortamında (SAP GUI kurulu değil) CANLI
bir SAP GUI'ye karşı ÇALIŞTIRILAMADI — sadece `win32com.client` import/DLL
yükleme zinciri, `/preflight`'ın SAP'sız yoldaki cevabı ve beklenen "SAPGUI
ProgID bulunamadı" hatası (MK_E_SYNTAX, SAP GUI kurulu olmayan bir makinede
TAM OLARAK beklenen davranış) doğrulandı. Gerçek bir SAP GUI'ye karşı
`describe_*`/`capture_*` fonksiyonlarının davranışı (özellikle grid tespiti
ve HardCopy'nin imzası) kullanıcının kendi makinesinde doğrulanmalı.
"""

from __future__ import annotations

import base64
import ctypes
import io
import json
import os
import re
import sys
import tempfile
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlsplit, parse_qs


def _ensure_pywin32_dll_dir() -> None:
    """pywin32'nin pythoncomXXX.dll/pywintypesXXX.dll'i (`pywin32_system32`
    altında) hem `os.add_dll_directory` hem PATH prepend ile bulunabilir hale
    getirir — `adt_rfc_bridge.py`'deki `_ensure_sapnwrfc_dll_dir()` ile AYNI
    kök sebep/aynı çözüm (Python 3.8+ `add_dll_directory` sadece extension
    modülünün KENDİ yüklemesini kapsar, DLL'in kendi iç `LoadLibrary`
    çağırımlarını değil — güvenli taraf için ikisi birden yapılır)."""
    if sys.platform != "win32":
        return
    site_packages = os.path.join(os.path.dirname(sys.executable), "Lib", "site-packages")
    dll_dir = os.path.join(site_packages, "pywin32_system32")
    if not os.path.isdir(dll_dir):
        return
    try:
        os.add_dll_directory(dll_dir)  # type: ignore[attr-defined]
    except (AttributeError, OSError):
        pass
    os.environ["PATH"] = dll_dir + os.pathsep + os.environ.get("PATH", "")


_ensure_pywin32_dll_dir()

try:
    import pythoncom
    import win32com.client
    import win32gui
except ImportError as exc:  # pragma: no cover - sadece kurulum bozuksa
    sys.stderr.write(
        "[sap-gui-scripting-bridge] FAIL: pywin32 (win32com/pythoncom/win32gui) import edilemedi: "
        + str(exc)
        + "\n  Bu embedded runtime bozuk olabilir - uygulamayı yeniden kur.\n"
    )
    sys.exit(1)

# Pillow ve win32ui SADECE ekran görüntüsü için gerekli — yokluğu bridge'i
# çökertmemeli, sadece "window" yakalama yöntemini devre dışı bırakmalı.
# HardCopy Pillow'suz da çalışır ama sonucu PNG OLMAYABİLİR (bkz. _ensure_png):
# o durumda ham baytlar doğru MIME ile geçilir, PNG'ye çevrilemez.
try:
    import win32ui  # type: ignore
    from PIL import Image, ImageGrab  # type: ignore

    _SCREENSHOT_FALLBACK_AVAILABLE = True
    _SCREENSHOT_FALLBACK_ERROR = ""
except Exception as exc:  # noqa: BLE001
    _SCREENSHOT_FALLBACK_AVAILABLE = False
    _SCREENSHOT_FALLBACK_ERROR = str(exc)


# PrintWindow ile yakalanan görüntünün yüksek DPI'lı ekranlarda ölçeklenip
# bulanıklaşmaması için process'i DPI-aware yap (etkisiz olması zararsız).
if sys.platform == "win32":
    try:
        ctypes.windll.user32.SetProcessDPIAware()
    except Exception:  # noqa: BLE001
        pass


class SapGuiScriptingError(Exception):
    """Kullanıcıya gösterilecek, teşhis edilmiş bir hata (HTTP body'sine
    olduğu gibi yazılır) - ham COM hata mesajlarından daha anlaşılır."""


# GERÇEK SAP GUI Scripting COM hata kodları (win32com com_error.args[0]) -
# resmi API dokümantasyonundan ve topluluk kaynaklarından derlendi. -2147221020
# (MK_E_SYNTAX) "SAPGUI" ProgID'i register değilse (SAP GUI kurulu değil) veya
# SAP Logon o an açık/registered değilse GetObject("SAPGUI") tarafından
# fırlatılır - bu bridge'in bu ortamda gerçekten aldığı hata budur (canlı
# doğrulandı, yukarıdaki modül docstring'ine bak).
MK_E_SYNTAX = -2147221020

# SAP GUI'nin klasik oturum penceresinin Win32 sınıf adı. Scripting KAPALI
# olsa bile bu pencereler görülebilir - `/preflight`'ın teşhisi tam olarak bu
# farka dayanıyor (pencere var + scripting oturumu yok = scripting kapalı).
SAP_SESSION_WINDOW_CLASS = "SAP_FRONTEND_SESSION"

# SAP GUI'nin kurulu OLUP OLMADIĞINI anlamak için (COM kaydı yoksa "kurulu
# değil" ile "açık değil" ayırt edilemez, ve bu iki durumun çözümü tamamen
# farklı). Sadece varlık kontrolü - hiçbir şey çalıştırılmıyor.
SAPLOGON_PATHS = (
    r"C:\Program Files (x86)\SAP\FrontEnd\SAPgui\saplogon.exe",
    r"C:\Program Files\SAP\FrontEnd\SAPgui\saplogon.exe",
    r"C:\Program Files (x86)\SAP\FrontEnd\SapGui\saplogon.exe",
    r"C:\Program Files\SAP\FrontEnd\SapGui\saplogon.exe",
)


def _sap_error_detail(exc: Exception) -> tuple[int | None, str]:
    """COM istisnasının İÇİNDEKİ SAP mesajını çıkarır: `(kod, açıklama)`.

    win32com bir `com_error`'u `(hresult, 'Exception occurred.', excepinfo,
    argerr)` olarak taşıyor ve okunabilir tek şey `excepinfo` içinde:
    `(617, 'SAP Frontend Server', 'The virtual key is not enabled.', ...)`.
    Bu ayıklanmazsa kullanıcı ekranda ham demeti görüyor — gerçekten öyle
    oldu (2026-09-03 kullanıcı bildirimi).
    """
    info = exc.args[2] if getattr(exc, "args", None) and len(exc.args) > 2 else None
    if isinstance(info, tuple) and len(info) >= 3:
        code = info[0] if isinstance(info[0], int) else None
        return code, str(info[2] or "")
    return None, ""


# SAP Frontend Server hata kodu: gönderilen sanal tuş O EKRANDA etkin değil.
# Bir hata değil, bir REDDETME - ve kullanıcının bunu ayırt edebilmesi gerek.
SAP_ERR_VKEY_NOT_ENABLED = 617
# "The method got an invalid argument" - sag tik menusunde taninmayan islev
# kodu/metin bununla donuyor (canli dogrulandi, 2026-09-03).
SAP_ERR_INVALID_ARGUMENT = 613
# "The control could not be found by id." - verilen eleman kimligi O ANKI
# ekranda yok. Kaydedilmis bir script'i tekrar oynatirken EN OLASI hata bu:
# adim baska bir ekranda kaydedilmis, simdiki ekranda o eleman yok.
SAP_ERR_ID_NOT_FOUND = 619


def _translate_com_error(exc: Exception) -> str:
    code = None
    if hasattr(exc, "args") and exc.args and isinstance(exc.args[0], int):
        code = exc.args[0]
    if code == MK_E_SYNTAX:
        return (
            "SAP GUI bulunamadı - SAP Logon'un açık ve içinde en az bir oturumun aktif "
            "olduğundan emin ol. Ayrıca SAP GUI kurulu olmalı (bu makinede 'SAPGUI' COM "
            "kaydı bulunamadı)."
        )
    # SAP'nin kendi mesajı varsa O gösterilir: aşağıdaki "scripting açık mı"
    # kontrol listesi burada YANILTICI olurdu, çünkü scripting zaten çalışıyor
    # ve reddeden SAP'nin kendisi.
    sap_code, sap_text = _sap_error_detail(exc)
    if sap_text:
        return f"SAP GUI reddetti: {sap_text}" + (f" [kod {sap_code}]" if sap_code else "")
    return (
        f"SAP GUI Scripting COM hatası: {exc}. Kontrol listesi: (1) SAP Logon açık ve en "
        "az bir oturum aktif mi, (2) SAP GUI Options (Alt+F12) -> Accessibility & "
        "Scripting -> Scripting -> 'Enable scripting' işaretli mi, (3) backend'de "
        "sapgui/user_scripting=TRUE profil parametresi açık mı (RZ11, Basis ile kontrol "
        "et)."
    )


_APPLICATION = None


def _attach_application():
    try:
        sap_gui_auto = win32com.client.GetObject("SAPGUI")
    except Exception as exc:
        raise SapGuiScriptingError(_translate_com_error(exc)) from exc
    if not sap_gui_auto:
        raise SapGuiScriptingError("SAPGUI COM nesnesi boş döndü - SAP Logon açık mı kontrol et.")
    try:
        return sap_gui_auto.GetScriptingEngine
    except Exception as exc:
        raise SapGuiScriptingError(_translate_com_error(exc)) from exc


def get_application():
    """`GuiApplication` referansını ÖNBELLEKTEN döner; yoksa/ölmüşse bağlanır.

    Önbellek bir performans önlemi DEĞİL, bir kullanılabilirlik önlemi:
    `GetScriptingEngine` çağrısı SAP GUI'nin "bir script SAP GUI'ye
    bağlanıyor" onay penceresini tetikliyor. Eskiden bu referans her HTTP
    isteğinde yeniden alınıyordu -- yani her ağaç düğümü, her ekran okuma,
    her aksiyon, her ekran görüntüsü ayrı bir onay penceresi demekti.
    Kullanıcı bunu "sürekli popup çıkıyor, çok yorucu" diye bildirdi
    (2026-09-03) ve haklıydı: tek bir ağaç açmak onlarca onay üretebiliyordu.

    Eski gerekçe "bağlantı/oturum listesi istekler arasında değişebilir"
    idi; bu doğru ama yeniden BAĞLANMAYI gerektirmiyor. `GuiApplication`
    canlı bir COM nesnesi ve `Connections` her erişimde SAP tarafında
    yeniden değerlendiriliyor -- aşağıdaki canlılık yoklaması bunu hem
    kanıtlıyor hem de tazeliği koruyor. Referans ölmüşse (SAP Logon
    kapatılıp açılmışsa) yoklama patlar ve bir kez yeniden bağlanılır.

    Tek iş parçacıklı `HTTPServer` + tek `CoInitialize` olduğu için COM
    apartman kuralları açısından güvenli; çok iş parçacıklı bir sunucuya
    geçilirse bu önbellek gözden geçirilmeli.
    """
    global _APPLICATION
    if _APPLICATION is not None:
        try:
            _APPLICATION.Connections.Count
            return _APPLICATION
        except Exception:  # noqa: BLE001 - ölü referans; yeniden bağlan
            _APPLICATION = None
    _APPLICATION = _attach_application()
    return _APPLICATION


def _try(fn, default=None):
    try:
        return fn()
    except Exception:
        return default


# ----------------------------------------------------------------------------
# Preflight — yetenek TESPİTİ (tahmin değil, ölçüm)
# ----------------------------------------------------------------------------


def sap_session_windows() -> list:
    """Görünür SAP GUI oturum pencerelerini (Win32 seviyesinde) listeler.
    Scripting kapalıyken de çalışır - teşhisin dayanağı bu."""
    found: list = []

    def _cb(hwnd, _extra):
        if not win32gui.IsWindowVisible(hwnd):
            return True
        cls = _try(lambda: win32gui.GetClassName(hwnd), "")
        if cls == SAP_SESSION_WINDOW_CLASS:
            found.append({"handle": int(hwnd), "title": _try(lambda: win32gui.GetWindowText(hwnd), "") or ""})
        return True

    _try(lambda: win32gui.EnumWindows(_cb, None))
    return found


def sap_gui_installed() -> bool:
    return any(os.path.isfile(p) for p in SAPLOGON_PATHS)


def preflight() -> dict:
    """`{sapGuiInstalled, sapRunning, classicWindows, scriptingAttachable,
    sessions, recommendation, scriptingError, windows}` döner.

    Karar tablosu (referans: sapgui-scripter eklentisinin `recommend()`
    fonksiyonu, aynı mantık - burada "kurulu mu" ayrımı da eklendi çünkü
    "kurulu değil" ile "açık değil" durumlarının çözümü tamamen farklı):
      - COM kaydı da yok, exe de yok         -> sapGuiMissing
      - kurulu ama hiç oturum penceresi yok  -> sapNotRunning
      - oturum 0 ve DisabledByServer=True    -> serverScriptingDisabled
      - pencere VAR ama scripting oturumu 0  -> scriptingDisabled
      - attachable ve sessions >= pencere>0  -> ready

    `GuiConnection.DisabledByServer` KRİTİK: sunucu tarafını istemci
    tarafından AYIRAN tek kesin sinyal. Bu okuma olmadan teşhis "ikisinden
    biri, ikisini de kontrol et" demek zorunda kalıyor; oysa bu bayrak True
    iken istemci ayarı zaten AÇIK demektir (aksi halde bağlantı listesi hiç
    okunamazdı) ve sorun yalnızca `sapgui/user_scripting` parametresidir.
    2026-09-03'te canlı bir sistemde (LED) ölçülerek doğrulandı: engine
    bağlanılabiliyor, Connections.Count=1, Children.Count=0,
    DisabledByServer=True.
    """
    windows = sap_session_windows()
    info: dict = {
        "sapGuiInstalled": sap_gui_installed(),
        "sapRunning": bool(windows),
        "classicWindows": len(windows),
        "scriptingAttachable": False,
        "sessions": 0,
        "connections": 0,
        "disabledByServer": False,
        "connectionDetails": [],
        "windows": windows[:12],
    }

    try:
        engine = get_application()
        info["scriptingAttachable"] = engine is not None
        version = _try(lambda: ".".join(str(_try(lambda p=p: getattr(engine, p), "?"))
                                        for p in ("MajorVersion", "MinorVersion", "Revision", "Patchlevel")))
        if version:
            info["guiVersion"] = version
        conn_count = _try(lambda: engine.Connections.Count, 0) or 0
        info["connections"] = conn_count
        total = 0
        for i in range(conn_count):
            conn = _try(lambda i=i: engine.Connections.ElementAt(i))
            if conn is None:
                continue
            children = _try(lambda conn=conn: conn.Children.Count, 0) or 0
            # DisabledByServer okunamayabilir (eski GUI sürümleri) - o zaman
            # None kalır ve "bilinmiyor" olarak taşınır, False DİYE
            # varsayılmaz.
            disabled = _try(lambda conn=conn: bool(conn.DisabledByServer))
            total += children
            if disabled:
                info["disabledByServer"] = True
            info["connectionDetails"].append({
                "index": i,
                "description": _try(lambda conn=conn: str(conn.Description), "") or "",
                "sessions": children,
                "disabledByServer": disabled,
            })
        info["sessions"] = total
    except SapGuiScriptingError as exc:
        info["scriptingError"] = str(exc)[:400]
    except Exception as exc:  # noqa: BLE001
        info["scriptingError"] = str(exc)[:400]

    if info["scriptingAttachable"] and info["sessions"] > 0 and info["sessions"] >= info["classicWindows"] > 0:
        info["recommendation"] = "ready"
    elif info["scriptingAttachable"] and info["sessions"] > 0:
        # Oturum var ama pencere sayısıyla uyuşmuyor (ör. bazı pencereler
        # başka bir kullanıcı oturumuna ait) - yine de kullanılabilir.
        info["recommendation"] = "ready"
    elif info["disabledByServer"]:
        # Sunucu reddediyor. İstemci ayarı zaten açık - bunu bilmek, boş yere
        # Alt+F12 ayarlarıyla uğraşmayı önlüyor.
        info["recommendation"] = "serverScriptingDisabled"
    elif info["classicWindows"] > 0:
        info["recommendation"] = "scriptingDisabled"
    elif info["sapGuiInstalled"]:
        info["recommendation"] = "sapNotRunning"
    else:
        info["recommendation"] = "sapGuiMissing"

    info["screenshotFallback"] = _SCREENSHOT_FALLBACK_AVAILABLE
    if not _SCREENSHOT_FALLBACK_AVAILABLE:
        info["screenshotFallbackError"] = _SCREENSHOT_FALLBACK_ERROR[:200]
    return info


# ----------------------------------------------------------------------------
# Betimleyiciler
# ----------------------------------------------------------------------------


def describe_connection(conn, index: int) -> dict:
    return {
        "index": index,
        "description": _try(lambda: conn.Description, ""),
        "sessionCount": _try(lambda: conn.Children.Count, 0)
    }


def describe_session_info(session) -> dict:
    info = _try(lambda: session.Info)
    if info is None:
        return {}
    fields = [
        "SystemName", "SystemSessionId", "Client", "User", "Language",
        "Transaction", "Program", "ScreenNumber", "SessionNumber",
        "ApplicationServer", "IsLowSpeedConnection", "ResponseTime",
        "InterpretationTime", "GuiCodePage"
    ]
    out: dict = {}
    for f in fields:
        value = _try(lambda f=f: getattr(info, f))
        if value is not None:
            out[f] = value
    return out


def describe_session(session, index: int) -> dict:
    return {
        "index": index,
        "id": _try(lambda: session.Id, ""),
        "busy": _try(lambda: bool(session.Busy), False),
        "info": describe_session_info(session)
    }


# GuiComponent'in TÜM alt tiplerinde ortak OLMAYAN alanlar (Text/Changeable/
# Tooltip vb.) tip başına farklı sözleşmelere sahip olabildiği için hepsi
# try/except ile "best effort" okunuyor - hiçbiri varsayılan olarak var
# SAYILMIYOR, sadece gerçekten okunabiliyorsa sonuca ekleniyor.
def describe_component_summary(comp) -> dict:
    out: dict = {
        "id": _try(lambda: comp.Id, ""),
        "type": _try(lambda: comp.Type, ""),
        "name": _try(lambda: comp.Name, "")
    }
    text = _try(lambda: comp.Text)
    if isinstance(text, str):
        out["text"] = text[:200]
    children = _try(lambda: comp.Children)
    out["hasChildren"] = bool(children is not None and _try(lambda: children.Count, 0) > 0)
    return out


GRID_CELL_LIMIT_ROWS = 200
GRID_CELL_LIMIT_COLS = 40

# HER `get_node` 200 SATIR OKUMAZ. Hucre basina bir COM cagrisi var ve o
# cagri ~2 ms: 200x40 = 8000 cagri, OLCULEN 16,4 sn (canli VBFA ALV'si,
# 2026-09-03) - ve kopru tek is parcacikli oldugu icin o sure boyunca
# BASKA HICBIR ISTEK kabul edilmiyor. Yani buyuk bir ALV secildiginde
# uygulama 16 saniye cevapsiz kaliyordu, ustelik cogu zaman o veriye
# ihtiyac bile yoktu (ajan zaten ilk 15 satiri kullaniyor).
# Artik varsayilan KUCUK bir pencere; daha fazlasi isteyen `rows`/
# `rowOffset` ile acikca ister. `GRID_CELL_LIMIT_ROWS` tavan olarak kaliyor.
GRID_DEFAULT_ROWS = 20

# SUTUN KIRPMASI DA BILDIRILIR. Satir kirpmasi bastan beri `truncated` ile
# soyleniyordu, sutun kirpmasi ise SESSIZDI: 42 sutunlu canli bir VBFA
# ALV'sinde (SE16N, 2026-09-03) son iki sutun kullaniciya hic haber
# verilmeden dusuyordu ve denetci tabloda 40 sutunu TAM liste gibi
# gosteriyordu. Eksik veriyi tam sanmak, veriyi hic gostermemekten daha
# kotu. Bu yuzden gercek sayilar (`columnCount`) ve ayri bayrak
# (`columnsTruncated`) ayrica tasiniyor.


def _grid_window(row_count: int, rows_wanted: int | None, row_offset: int) -> tuple[int, int]:
    """Okunacak satir penceresini hesaplar: (baslangic, adet).

    `rows_wanted` verilmezse `GRID_DEFAULT_ROWS`, verilirse tavanla
    (`GRID_CELL_LIMIT_ROWS`) sinirlanir. Offset satir sayisini asiyorsa
    pencere BOS doner - hata degil, sadece o sayfada satir yok.
    """
    offset = max(0, min(row_offset, max(row_count, 0)))
    wanted = GRID_DEFAULT_ROWS if rows_wanted is None else max(0, rows_wanted)
    wanted = min(wanted, GRID_CELL_LIMIT_ROWS)
    return offset, max(0, min(wanted, row_count - offset))


def _describe_grid(
    comp,
    comp_type: str,
    sub_type: str,
    rows_wanted: int | None = None,
    row_offset: int = 0,
) -> dict | None:
    """GuiGridView (ALV grid) veya GuiTableControl (klasik table control)
    icin GERCEK Scripting API'sine gore (bkz. arastirma notlari,
    help.sap.com GuiGridView/GuiTableControl referanslari) veri okur.
    Bu iki tipin API'si TAMAMEN FARKLI - birbirine karistirilmaz.

    Satirlar PENCERE PENCERE okunur (`rows_wanted`/`row_offset`) - nedeni
    icin bkz. `GRID_DEFAULT_ROWS`. `rowOffset` cevaba yaziliyor ki
    okuyan taraf gordugu satirlarin gercek numaralarini bilsin: aksi halde
    ikinci sayfanin ilk satiri "0. satir" sanilir ve o numarayla yapilan
    bir `doubleClick` BASKA BIR SATIRI acar.
    """
    is_alv = comp_type == "GuiGridView" or (comp_type == "GuiShell" and sub_type == "GridView")
    is_table_control = comp_type == "GuiTableControl"
    if not is_alv and not is_table_control:
        return None

    if is_alv:
        row_count = _try(lambda: comp.RowCount, 0)
        col_order = _try(lambda: list(comp.ColumnOrder), [])
        col_total = len(col_order)
        col_order = col_order[:GRID_CELL_LIMIT_COLS]
        offset, take = _grid_window(row_count, rows_wanted, row_offset)
        rows = []
        for r in range(offset, offset + take):
            row = {}
            for c in col_order:
                row[c] = _try(lambda r=r, c=c: comp.GetCellValue(r, c), "")
            rows.append(row)
        return {
            "kind": "alv",
            "rowCount": row_count,
            "columnCount": col_total,
            "columns": col_order,
            "rows": rows,
            "rowOffset": offset,
            "truncated": offset + take < row_count,
            "columnsTruncated": col_total > len(col_order)
        }

    # GuiTableControl (step-loop klasik tablo)
    visible_row_count = _try(lambda: comp.VisibleRowCount, 0)
    row_count = _try(lambda: comp.RowCount, visible_row_count)
    columns = _try(lambda: comp.Columns, None)
    col_names = []
    if columns is not None:
        col_count = _try(lambda: columns.Count, 0)
        for i in range(col_count):
            col = _try(lambda i=i: columns.ElementAt(i))
            name = _try(lambda col=col: col.Name, str(i)) if col is not None else str(i)
            col_names.append(name)
    col_total = len(col_names)
    col_names = col_names[:GRID_CELL_LIMIT_COLS]
    # KLASIK TABLE CONTROL'DE PENCERE `VisibleRowCount` ILE SINIRLI.
    # `GetCell` yalnizca EKRANDA GORUNEN satirlari okuyabiliyor - gorunmeyen
    # bir satir icin bos donuyor. `RowCount` toplam satiri (sunucudaki) verir,
    # o yuzden offset+adet gorunen pencereye kirpilir; yoksa "okundu ama hepsi
    # bos" gibi bir sonuc cikar ve bu, veri yokmus gibi gorunur.
    visible_cap = visible_row_count if visible_row_count else row_count
    offset, take = _grid_window(min(row_count, visible_cap), rows_wanted, row_offset)
    rows = []
    for r in range(offset, offset + take):
        row = {}
        for name in col_names:
            cell = _try(lambda r=r, name=name: comp.GetCell(r, name))
            row[name] = _try(lambda cell=cell: cell.Text, "") if cell is not None else ""
        rows.append(row)
    return {
        "kind": "table-control",
        "rowCount": row_count,
        "columnCount": col_total,
        "columns": col_names,
        "rows": rows,
        "rowOffset": offset,
        "truncated": offset + take < row_count,
        "columnsTruncated": col_total > len(col_names)
    }


# Eleman denetçisinin okuduğu TÜM özellikler. Hiçbiri her tipte var değil -
# `_try` ile okunur, okunamayan sonuca HİÇ eklenmez (UI "—" gösterir).
# GEOMETRİ (Left/Top/Width/Height) burada ayrı bir amaç taşıyor: canlı ekran
# görüntüsünün üzerine seçili elemanın çerçevesini çizmeyi mümkün kılıyor.
DETAIL_PROPERTIES = (
    ("tooltip", "Tooltip"),
    ("defaultTooltip", "DefaultTooltip"),
    ("changeable", "Changeable"),
    ("subType", "SubType"),
    ("modified", "Modified"),
    ("visible", "Visible"),
    ("highlighted", "Highlighted"),
    ("iconName", "IconName"),
    ("maxLength", "MaxLength"),
    ("required", "Required"),
    ("key", "Key"),
    ("value", "Value"),
    ("selected", "Selected"),
    ("left", "Left"),
    ("top", "Top"),
    ("width", "Width"),
    ("height", "Height"),
    ("screenLeft", "ScreenLeft"),
    ("screenTop", "ScreenTop"),
    ("charLeft", "CharLeft"),
    ("charTop", "CharTop"),
    ("charWidth", "CharWidth"),
    ("charHeight", "CharHeight"),
    ("rowCount", "RowCount"),
    ("columnCount", "ColumnCount"),
    ("visibleRowCount", "VisibleRowCount"),
    ("currentRow", "CurrentRow"),
    ("currentColumn", "CurrentColumn"),
    ("messageType", "MessageType"),
    ("messageId", "MessageId"),
    ("messageNumber", "MessageNumber"),
)


def describe_component_detail(comp, rows_wanted: int | None = None, row_offset: int = 0) -> dict:
    out = describe_component_summary(comp)
    out.pop("hasChildren", None)
    props: dict = {}
    for key, attr in DETAIL_PROPERTIES:
        value = _try(lambda attr=attr: getattr(comp, attr))
        if value is None:
            continue
        if isinstance(value, (str, int, float, bool)):
            props[key] = value[:300] if isinstance(value, str) else value
    # UI'ın her zaman beklediği (mevcut sözleşmeyi bozmayan) alanlar.
    out["tooltip"] = props.get("tooltip", "") or ""
    out["subType"] = props.get("subType", "") or ""
    changeable = props.get("changeable")
    out["changeable"] = bool(changeable) if isinstance(changeable, bool) else None
    out["properties"] = props

    children = _try(lambda: comp.Children)
    child_list = []
    if children is not None:
        count = _try(lambda: children.Count, 0)
        for i in range(count):
            child = _try(lambda i=i: children.ElementAt(i))
            if child is not None:
                child_list.append(describe_component_summary(child))
    out["children"] = child_list
    grid = _try(lambda: _describe_grid(comp, out.get("type", ""), out.get("subType", ""), rows_wanted, row_offset))
    if grid is not None:
        out["grid"] = grid
    return out


def resolve_session(application, conn_idx: int, sess_idx: int):
    connections = application.Connections
    if conn_idx < 0 or conn_idx >= connections.Count:
        raise SapGuiScriptingError(f"Bağlantı index'i geçersiz: {conn_idx} (toplam {connections.Count} bağlantı var).")
    connection = connections.ElementAt(conn_idx)
    sessions = connection.Children
    if sess_idx < 0 or sess_idx >= sessions.Count:
        raise SapGuiScriptingError(f"Oturum index'i geçersiz: {sess_idx} (bağlantı {conn_idx}'de {sessions.Count} oturum var).")
    return sessions.ElementAt(sess_idx)


def resolve_component(session, element_id: str | None):
    if not element_id:
        # Varsayılan: aktif ana pencere (wnd[0]) - GERCEK Scripting API'sinde
        # session.ActiveWindow bu amaç icin var, ama bazı GUI sürümlerinde
        # eksik olabildiği için findById("wnd[0]") daha güvenilir fallback.
        window = _try(lambda: session.ActiveWindow)
        if window is not None:
            return window
        return session.findById("wnd[0]")
    # 619 OKUNUR HALE GETIRILIR. `findById` bulamadiginda ham COM demeti
    # yukari kadar cikiyordu: kullanici "Beklenmeyen hata: (-2147352567,
    # 'Exception occurred.', (619, 'SAP Frontend Server', ...))" goruyor ve
    # icinde ARADIGI KIMLIK bile yaziliyor degil. Kayitli bir script'i tekrar
    # oynatirken en sik karsilasilacak hata tam olarak budur (canli goruldu,
    # 2026-09-03) - ve bu haliyle "hangi adim, hangi eleman" sorusuna cevap
    # vermiyordu.
    try:
        return session.findById(element_id)
    except Exception as exc:
        sap_code, _ = _sap_error_detail(exc)
        if sap_code == SAP_ERR_ID_NOT_FOUND:
            raise SapGuiScriptingError(
                f"Bu eleman su anki ekranda yok: {element_id!r}. "
                "Kayitli bir adim oynatiliyorsa, adim baska bir ekranda "
                "kaydedilmis olabilir - once o ekrana gidilmeli."
            ) from exc
        raise


# ----------------------------------------------------------------------------
# Ekran durumu — durum çubuğu, popup, başlık, ok-code
# ----------------------------------------------------------------------------

# Popup gövde metni toplanırken dikkate alınan tipler. SAP'nin standart
# mesaj popup'ları (SPOP) metni GuiLabel/GuiTextField olarak taşır.
POPUP_TEXT_TYPES = ("GuiLabel", "GuiTextField", "GuiCTextField")
POPUP_TEXT_LIMIT = 12


def _collect_popup_text(comp, acc: list, depth: int = 0) -> None:
    if depth > 4 or len(acc) >= POPUP_TEXT_LIMIT:
        return
    comp_type = _try(lambda: comp.Type, "")
    if comp_type in POPUP_TEXT_TYPES:
        text = _try(lambda: comp.Text, "")
        if isinstance(text, str) and text.strip():
            acc.append(text.strip()[:200])
    children = _try(lambda: comp.Children)
    if children is None:
        return
    for i in range(_try(lambda: children.Count, 0) or 0):
        child = _try(lambda i=i: children.ElementAt(i))
        if child is not None:
            _collect_popup_text(child, acc, depth + 1)


def _collect_buttons(comp, acc: list, depth: int = 0) -> None:
    if depth > 4 or len(acc) >= 12:
        return
    if _try(lambda: comp.Type, "") == "GuiButton":
        acc.append({
            "id": _try(lambda: comp.Id, ""),
            "text": (_try(lambda: comp.Text, "") or "").strip()[:80],
            "tooltip": (_try(lambda: comp.Tooltip, "") or "").strip()[:120],
        })
    children = _try(lambda: comp.Children)
    if children is None:
        return
    for i in range(_try(lambda: children.Count, 0) or 0):
        child = _try(lambda i=i: children.ElementAt(i))
        if child is not None:
            _collect_buttons(child, acc, depth + 1)


def read_status_bar(session) -> dict | None:
    """`wnd[0]/sbar`'ı okur. type: S(uccess)/W(arning)/E(rror)/A(bort)/
    I(nformation) - E ve A GERÇEK hatadır. Bu bilgi olmadan SAP'nin
    reddettiği bir aksiyon UI'da 'başarılı' görünür."""
    sbar = _try(lambda: session.findById("wnd[0]/sbar"))
    if sbar is None:
        return None
    text = _try(lambda: sbar.Text, "") or ""
    msg_type = (_try(lambda: sbar.MessageType, "") or "").upper()
    if not text and not msg_type:
        return None
    return {
        "type": msg_type,
        "text": text[:400],
        "messageId": _try(lambda: sbar.MessageId, "") or "",
        "messageNumber": _try(lambda: sbar.MessageNumber, "") or "",
    }


_TOOLBAR_BTN_RE = re.compile(r"^btn\[(\d+)\]$")


def read_toolbar_keys(session) -> list:
    """Standart araç çubuğundaki tuşları ve o ekranda ETKİN olup olmadıklarını
    okur: `[{vkey, enabled, tooltip}]`.

    NEDEN: `sendVKey` etkin olmayan bir tuşa gönderilince SAP 617 ("The
    virtual key is not enabled") ile reddediyor. Kullanıcı bunu ancak
    TIKLADIKTAN sonra öğreniyordu — "kaydet çalışmıyor" şikayetinin tamamı
    buydu (2026-09-03). Oysa bilgi ekranda zaten duruyor: SAP kendi araç
    çubuğunda o butonu soluk gösteriyor, ve `GuiButton.Changeable` bunu
    birebir veriyor (canlı doğrulandı: SE09'da `btn[11]` Changeable=False,
    ve sendVKey(11) tam olarak 617 döndü).

    `Tooltip` de SAP'nin KENDİ, oturum dilindeki etiketi ("Kaydet (Ctrl+S)")
    — bizim statik anlam tablomuzdan üstün, çünkü transaction tuşu yeniden
    atamışsa bile doğru.

    Araç çubuğunda GÖRÜNMEYEN tuşlar (alan içindeki F4 gibi) bu listede yok;
    "listede yok" = "etkin değil" DEĞİL, "bilinmiyor" demektir — UI bunu
    böyle yorumlamalı, yoksa çalışan bir tuşu soluk gösterir.
    """
    # AKTİF pencerenin araç çubuğu, `wnd[0]`'ınki DEĞİL. Sabit `wnd[0]` okumak,
    # modal bir pencere açıkken ARKADAKİ ekranın tuşlarını o anki ekranınmış
    # gibi bildiriyordu. SE16N'de bir ALV satırına çift tıklandığında gelen
    # "Ayrıntı görüntüsü" (wnd[1]) tam olarak bunu gösterdi: liste ekranının
    # F3'ü "etkin" diye raporlanıyor, tuş gönderilince SAP 617 ile reddediyor
    # ve kullanıcı kendi içinde çelişen bir mesaj görüyordu — "F3 etkin değil
    # ... şu an etkin olanlar: Geriye (F3)". O modalde gerçekte yalnızca
    # Devam(0), Ara(71), Aramaya devam(84) ve İptal(12) var (canlı doğrulandı,
    # 2026-09-03). Araç çubuğu olmayan bir pencerede boş liste dönüyor; bu
    # "hepsi kapalı" değil "bilinmiyor" demek ve UI zaten böyle yorumluyor.
    window = _try(lambda: session.ActiveWindow)
    window_id = (_try(lambda: window.Id, "") or "") if window is not None else ""
    toolbar = _try(lambda: session.findById(f"{window_id}/tbar[0]")) if window_id else None
    if toolbar is None:
        toolbar = _try(lambda: session.findById("wnd[0]/tbar[0]")) if not window_id else None
    if toolbar is None:
        return []
    children = _try(lambda: toolbar.Children)
    if children is None:
        return []
    count = _try(lambda: int(children.Count), 0) or 0
    keys: list = []
    for i in range(count):
        comp = _try(lambda i=i: children.ElementAt(i))
        if comp is None:
            continue
        match = _TOOLBAR_BTN_RE.match(_try(lambda: comp.Name, "") or "")
        if not match:
            continue
        enabled = bool(_try(lambda: comp.Changeable, False))
        # Soluk butonun tooltip'i zaten boş dönüyor (canlı doğrulandı) -
        # okumamak bir COM çağrısı tasarrufu, kayıp değil.
        tooltip = (_try(lambda: comp.Tooltip, "") or "").strip() if enabled else ""
        keys.append({
            "vkey": int(match.group(1)),
            "enabled": enabled,
            # SAP tooltip'i "Kaydet   (Ctrl+S)" gibi çoklu boşluk içeriyor.
            "tooltip": " ".join(tooltip.split())[:80],
        })
    return keys


def describe_screen(session, with_toolbar_keys: bool = True) -> dict:
    """Bir aksiyondan SONRA tek çağrıda okunması gereken her şey: hangi
    transaction/ekran, aktif pencere popup mu, popup'ta hangi butonlar var,
    durum çubuğunda ne yazıyor. UI bunu her aksiyondan sonra tazeler."""
    out: dict = {}
    info = _try(lambda: session.Info)
    if info is not None:
        out["transaction"] = _try(lambda: info.Transaction, "") or ""
        out["program"] = _try(lambda: info.Program, "") or ""
        out["screenNumber"] = _try(lambda: info.ScreenNumber, 0)
        out["systemName"] = _try(lambda: info.SystemName, "") or ""
        out["client"] = _try(lambda: info.Client, "") or ""
        out["user"] = _try(lambda: info.User, "") or ""
    out["busy"] = _try(lambda: bool(session.Busy), False)

    window = _try(lambda: session.ActiveWindow)
    if window is None:
        window = _try(lambda: session.findById("wnd[0]"))
    if window is not None:
        out["windowId"] = _try(lambda: window.Id, "") or ""
        out["title"] = (_try(lambda: window.Text, "") or "")[:200]
        window_type = _try(lambda: window.Type, "") or ""
        out["windowType"] = window_type
        is_popup = window_type == "GuiModalWindow" or "/wnd[0]" not in out.get("windowId", "")
        out["isPopup"] = bool(is_popup)
        if is_popup:
            texts: list = []
            _collect_popup_text(window, texts)
            buttons: list = []
            _collect_buttons(window, buttons)
            out["popup"] = {
                "id": out.get("windowId", ""),
                "title": out.get("title", ""),
                "text": "\n".join(texts),
                "buttons": buttons,
            }

    status = read_status_bar(session)
    if status is not None:
        out["statusBar"] = status
    okcd = _try(lambda: session.findById("wnd[0]/tbar[0]/okcd"))
    if okcd is not None:
        out["okCode"] = (_try(lambda: okcd.Text, "") or "")[:60]
    if with_toolbar_keys:
        out["toolbarKeys"] = _try(lambda: read_toolbar_keys(session), []) or []
    return out


def _settle(session, timeout: float = 3.0) -> dict:
    """Aksiyondan sonra oturum meşgulse kısa süre bekler. SAP GUI Scripting
    çağrıları genelde senkron ama sunucu turu gerektiren tuşlarda (Enter/F8)
    `Busy` bir süre TRUE kalabiliyor - bu bekleme olmadan ardından okunan
    durum çubuğu bir ÖNCEKİ ekrana ait olur.

    NE OLDUĞUNU ARTIK RAPOR EDİYOR: {"waitedMs", "busySeen", "settled"}.
    Sessizce beklediği sürece çağıran tarafın elinde tek bir bilgi yoktu, o
    yüzden oynatıcı adımlar arasına 350 ms'lik SABİT bir uyku koyuyordu -
    hazır olan oturumu boşuna bekleten, hazır olmayanı ise kurtarmayan bir
    sayı. Beklemenin BURADA yapılması gerekiyor: oturum nesnesi burada,
    HTTP turu yok. `settled: False` ise bekleme zaman aşımına uğradı ve bir
    sonraki aksiyon meşgul bir oturuma gidecek demektir - bu, uydurulacak
    değil söylenecek bir şey."""
    started = time.time()
    deadline = started + timeout
    busy_seen = False
    while True:
        if not _try(lambda: bool(session.Busy), False):
            return {"waitedMs": int((time.time() - started) * 1000),
                    "busySeen": busy_seen, "settled": True}
        busy_seen = True
        if time.time() >= deadline:
            return {"waitedMs": int((time.time() - started) * 1000),
                    "busySeen": True, "settled": False}
        time.sleep(0.08)


# ----------------------------------------------------------------------------
# Odak koruma — DENENDİ VE GERİ ALINDI, tekrar denenmesin diye burada
# ----------------------------------------------------------------------------
#
# SAP GUI'nin kendini öne fırlatmasına karşı "önceki pencereyi geri ver"
# şeklinde bir sarmalayıcı yazıldı (2026-09-03) ve KÖPRÜYÜ KİLİTLEDİ:
# ilk `hardcopy` isteği hiç dönmedi, ardından `/health` bile 8 saniyede
# cevap vermedi. Sebep `AttachThreadInput`: Windows'ta yabancı bir sürecin
# odağı geri alabilmesinin standart yolu bu, ama girdi kuyruğunu SAP GUI'nin
# UI thread'ine bağlıyor ve o thread o sırada HardCopy'yi yazmakla meşgul —
# tek iş parçacıklı `HTTPServer`'da bu, tüm köprünün donması demek.
#
# Sentetik ALT tuşu göndermek (diğer bilinen yöntem) da elenmişti: kullanıcının
# o an öndeki penceresine gerçek girdi enjekte ediyor ve menü çubuğunu açıyor.
#
# Asıl düzeltme zaten `capture_screenshot`'taki sıra değişikliği (önce
# `window`): odağı çaldığı ÖLÇÜLEN tek adım HardCopy'ydi ve `auto` artık
# ona hiç uğramıyor. Odak yine de çalınıyorsa çözüm bu yol DEĞİL.
#
# ----------------------------------------------------------------------------
# Ekran görüntüsü
# ----------------------------------------------------------------------------


def _capture_hardcopy(session) -> bytes:
    """SAP'nin KENDİ ekran yakalaması - en temiz sonuç (pencere üstünde başka
    bir uygulama olsa bile doğru görüntü), ama bağlı bir DIAG oturumu şart."""
    window = _try(lambda: session.ActiveWindow) or session.findById("wnd[0]")
    path = os.path.join(tempfile.gettempdir(), f"axet_sapshot_{os.getpid()}_{int(time.time() * 1000)}.png")
    last_error: Exception | None = None
    # HardCopy'nin imzası SAP GUI sürümüne göre değişiyor (2 argümanlı
    # dosya+tip, ya da tek argümanlı) - ikisi de denenir.
    for args in ((path, "PNG"), (path,)):
        try:
            window.HardCopy(*args)
            last_error = None
            break
        except Exception as exc:  # noqa: BLE001
            last_error = exc
    if last_error is not None:
        raise SapGuiScriptingError(f"HardCopy başarısız: {last_error}")
    deadline = time.time() + 3.0
    while not os.path.isfile(path) and time.time() < deadline:
        time.sleep(0.05)
    if not os.path.isfile(path):
        raise SapGuiScriptingError("HardCopy bir dosya üretmedi.")
    try:
        with open(path, "rb") as fh:
            return fh.read()
    finally:
        _try(lambda: os.remove(path))


_PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


def _ensure_png(data: bytes) -> tuple[bytes, str]:
    """HardCopy çıktısını PNG'ye çevirir; `(bayt, mime)` döner.

    SAP GUI 8000.257.1.17'de `HardCopy(path, "PNG")` istenen biçimi YOK
    SAYIP 24-bit BMP yazıyor. Canlı ölçüm (S4D, 2026-09-03): 1650x1032'lik
    bir ekran için 5.110.518 bayt = 54 baytlık BMP başlığı + 4 bayta
    hizalanmış satırlar; ilk iki bayt `BM`.

    Bu baytları "data:image/png" diye etiketlemek iki ayrı soruna yol
    açıyordu: tarayıcı görüntüyü çizemiyordu, ve ham BMP base64'e
    çevrilince her yakalamada ~6,8 MB'lık bir dataURL IPC'den geçiyordu
    (PNG'ye çevrilince ~60 KB). Uzantıya ya da istenen biçime GÜVENMEK
    yerine baytların kendisine bakılıyor.
    """
    if data[:8] == _PNG_MAGIC:
        return data, "image/png"
    if not _SCREENSHOT_FALLBACK_AVAILABLE:
        # Pillow yoksa çeviremeyiz. Yanlış etiket yapıştırmaktansa doğru
        # MIME ile geç — Chromium BMP'yi zaten gösterebiliyor.
        return data, "image/bmp" if data[:2] == b"BM" else "application/octet-stream"
    buffer = io.BytesIO()
    Image.open(io.BytesIO(data)).convert("RGB").save(buffer, format="PNG", optimize=True)
    return buffer.getvalue(), "image/png"


def find_sap_window(preferred_title: str = "") -> int | None:
    """Yakalanacak SAP oturum penceresini seçer. Başlık verilmişse onunla
    eşleşeni, yoksa EN UZUN başlıklı olanı (SAP ana oturum penceresinin
    başlığı tipik olarak en açıklayıcı olandır) tercih eder."""
    windows = sap_session_windows()
    if not windows:
        return None
    if preferred_title:
        for win in windows:
            if win["title"] and win["title"] in preferred_title:
                return win["handle"]
        for win in windows:
            if preferred_title in (win["title"] or ""):
                return win["handle"]
    return max(windows, key=lambda w: len(w["title"] or ""))["handle"]


PW_RENDERFULLCONTENT = 2


def _capture_window(hwnd: int) -> dict:
    """Win32 PrintWindow ile yakalar - SCRIPTING KAPALI OLSA BİLE çalışır,
    çünkü COM'a hiç dokunmuyor. PW_RENDERFULLCONTENT (2) DirectComposition
    ile çizilen içeriğin de yakalanmasını sağlar; başarısız olursa ekranın
    o bölgesi ImageGrab ile alınır (pencere önde değilse yanlış görüntü
    verebilir - bu yüzden sadece son çare)."""
    if not _SCREENSHOT_FALLBACK_AVAILABLE:
        raise SapGuiScriptingError(
            f"Pencere yakalama kullanılamıyor (Pillow/win32ui yüklenemedi: {_SCREENSHOT_FALLBACK_ERROR})."
        )
    left, top, right, bottom = win32gui.GetWindowRect(hwnd)
    width, height = right - left, bottom - top
    if width <= 0 or height <= 0:
        raise SapGuiScriptingError("SAP penceresinin boyutu okunamadı (simge durumunda olabilir).")

    window_dc = win32gui.GetWindowDC(hwnd)
    mfc_dc = win32ui.CreateDCFromHandle(window_dc)
    save_dc = mfc_dc.CreateCompatibleDC()
    bitmap = win32ui.CreateBitmap()
    try:
        bitmap.CreateCompatibleBitmap(mfc_dc, width, height)
        save_dc.SelectObject(bitmap)
        ok = ctypes.windll.user32.PrintWindow(hwnd, save_dc.GetSafeHdc(), PW_RENDERFULLCONTENT)
        if not ok:
            ok = ctypes.windll.user32.PrintWindow(hwnd, save_dc.GetSafeHdc(), 0)
        if ok:
            info = bitmap.GetInfo()
            bits = bitmap.GetBitmapBits(True)
            image = Image.frombuffer("RGB", (info["bmWidth"], info["bmHeight"]), bits, "raw", "BGRX", 0, 1)
        else:
            image = ImageGrab.grab(bbox=(left, top, right, bottom))
    finally:
        _try(lambda: win32gui.DeleteObject(bitmap.GetHandle()))
        _try(lambda: save_dc.DeleteDC())
        _try(lambda: mfc_dc.DeleteDC())
        _try(lambda: win32gui.ReleaseDC(hwnd, window_dc))

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    # `origin` = yakalanan görüntünün SOL ÜST KÖŞESİNİN mutlak ekran
    # koordinatı. Bir elemanın `ScreenLeft`/`ScreenTop` değeri de mutlak ekran
    # koordinatı olduğu için, UI seçili elemanın çerçevesini görüntü üzerine
    # TAHMİNSİZ çizebiliyor: kutu = (ScreenLeft - originLeft, ScreenTop -
    # originTop). HardCopy yönteminde böyle bir köken bilgisi YOK, bu yüzden
    # orada çerçeve çizilmiyor (yanlış yerde bir kutu, hiç kutu olmamasından
    # kötüdür).
    return {
        "data": buffer.getvalue(),
        "originLeft": left,
        "originTop": top,
        "width": image.width,
        "height": image.height,
    }


def capture_screenshot(session, method: str = "auto") -> dict:
    """`{dataUrl, method, bytes}` döner. 'auto' önce pencere yakalamayı,
    sonra HardCopy'yi dener.

    BU SIRA 2026-09-03'te TERSİNE ÇEVRİLDİ. Eskiden HardCopy önce
    geliyordu ("SAP'nin kendi görüntüsü daha temiz"), ama canlı ölçüm
    HardCopy'nin SAP GUI penceresini KULLANICININ ÜZERİNE fırlattığını
    gösterdi — ve UI her aksiyondan sonra otomatik olarak görüntü
    tazelediği için, uygulamada bir şey yapmak SAP'ın öne atlaması
    demek oluyordu. Pencere yakalamada 12 ölçümün 12'sinde bu olmadı.

    Sıranın bedeli yok, üstelik iki kazancı var: PrintWindow üste binmiş
    pencerelerin altındaki içeriği de çiziyor (HardCopy'nin tek üstünlüğü
    buydu), ve `origin` koordinatı yalnızca bu yolda döndüğü için seçili
    eleman çerçevesi de ancak burada çizilebiliyor.
    """
    attempts: list[str] = []
    errors: list[str] = []

    if method in ("auto", "window"):
        attempts.append("window")
        preferred = ""
        if session is not None:
            window = _try(lambda: session.findById("wnd[0]"))
            if window is not None:
                preferred = _try(lambda: window.Text, "") or ""
        hwnd = find_sap_window(preferred)
        if hwnd is None:
            errors.append("window: açık bir SAP oturum penceresi bulunamadı.")
        else:
            try:
                shot = _capture_window(hwnd)
                data = shot["data"]
                return {
                    "dataUrl": "data:image/png;base64," + base64.b64encode(data).decode("ascii"),
                    "method": "window",
                    "bytes": len(data),
                    "originLeft": shot["originLeft"],
                    "originTop": shot["originTop"],
                    "width": shot["width"],
                    "height": shot["height"],
                }
            except Exception as exc:  # noqa: BLE001
                errors.append(f"window: {exc}")

    if method in ("auto", "hardcopy") and session is not None:
        attempts.append("hardcopy")
        try:
            data, mime = _ensure_png(_capture_hardcopy(session))
            return {"dataUrl": f"data:{mime};base64," + base64.b64encode(data).decode("ascii"),
                    "method": "hardcopy", "bytes": len(data)}
        except Exception as exc:  # noqa: BLE001
            errors.append(f"hardcopy: {exc}")

    raise SapGuiScriptingError(
        "Ekran görüntüsü alınamadı (denenen: " + ", ".join(attempts) + "). " + " | ".join(errors)
    )


# ----------------------------------------------------------------------------
# İstek işleyiciler
# ----------------------------------------------------------------------------


def handle_list_connections(application) -> list:
    connections = application.Connections
    return [describe_connection(connections.ElementAt(i), i) for i in range(connections.Count)]


def handle_list_sessions(application, conn_idx: int) -> list:
    connections = application.Connections
    if conn_idx < 0 or conn_idx >= connections.Count:
        raise SapGuiScriptingError(f"Bağlantı index'i geçersiz: {conn_idx}.")
    connection = connections.ElementAt(conn_idx)
    sessions = connection.Children
    return [describe_session(sessions.ElementAt(i), i) for i in range(sessions.Count)]


def handle_get_node(
    application,
    conn_idx: int,
    sess_idx: int,
    element_id: str | None,
    rows_wanted: int | None = None,
    row_offset: int = 0,
) -> dict:
    session = resolve_session(application, conn_idx, sess_idx)
    comp = resolve_component(session, element_id)
    return describe_component_detail(comp, rows_wanted, row_offset)


ALLOWED_ACTIONS = {
    "setText", "press", "select", "sendVKey", "selectContextMenuItem", "doubleClick",
    # Kolaylık primitifleri. AYRI bir uç nokta DEĞİL, bilerek birer "aksiyon":
    # böylece kaydedici/oynatıcı (Faz 2) bunları hiçbir değişiklik olmadan
    # kaydedip tekrar oynatabiliyor.
    "navigate", "popupChoice",
}

# Popup seçenekleri -> önce standart SPOP butonu, olmazsa toolbar butonu,
# o da olmazsa sanal tuş. Sıra önemli: SPOP butonları en spesifik olanlar.
POPUP_CHOICES = {
    "enter": (["usr/btnSPOP-OPTION1", "tbar[0]/btn[0]"], 0),
    "yes": (["usr/btnSPOP-OPTION1", "tbar[0]/btn[0]"], 0),
    "no": (["usr/btnSPOP-OPTION2", "tbar[0]/btn[1]"], 0),
    "cancel": (["tbar[0]/btn[12]"], 12),
}


def _apply_navigate(session, tcode: str) -> None:
    code = (tcode or "").strip()
    if not code:
        raise SapGuiScriptingError("Transaction kodu boş olamaz.")
    if not code.startswith("/"):
        code = "/n" + code
    okcd = _try(lambda: session.findById("wnd[0]/tbar[0]/okcd"))
    if okcd is None:
        raise SapGuiScriptingError("Komut alanı (wnd[0]/tbar[0]/okcd) bulunamadı - aktif bir SAP ekranı var mı?")
    okcd.Text = code
    session.findById("wnd[0]").sendVKey(0)


CONTEXT_MENU_MODES = ("code", "text", "position")


def _menu_items(menu, depth: int = 0) -> list:
    """Bir menu dugumunun ogelerini okur: metin + SAP islev kodu.

    `Key` SAP'nin islev kodudur ("&XXL" gibi) - `selectContextMenuItem`'in
    "code" yontemi TAM OLARAK bunu bekliyor. Yani menu okunabiliyorsa, kod
    tahmin edilmek zorunda degil: burada yaziyor.
    """
    items: list = []
    children = _try(lambda: menu.Children)
    if children is None:
        return items
    for i in range(min(_try(lambda: children.Count, 0) or 0, 200)):
        child = _try(lambda i=i: children.ElementAt(i))
        if child is None:
            continue
        item = {
            "position": i,
            "text": (_try(lambda: child.Text, "") or "").strip()[:120],
            # Islev kodu iki ayri yerde olabiliyor ve HANGISI oldugu belgeli
            # degil: `Key` menu ogelerinde cogunlukla bos donuyor (canli
            # olcum, ana menu cubugu), `Name` ise SAP'nin ic adini tasiyor.
            # Ikisi de yaziliyor - tahmin etmemek icin.
            "code": (_try(lambda: child.Key, "") or "").strip()[:40],
            "name": (_try(lambda: child.Name, "") or "").strip()[:40],
            "type": _try(lambda: child.Type, "") or "",
        }
        if depth < 3:
            sub = _menu_items(child, depth + 1)
            if sub:
                item["items"] = sub
        items.append(item)
    return items


def _collect_menus(comp, acc: list, depth: int = 0) -> None:
    """Bir agacta menu tipindeki dugumleri toplar (GuiMenubar/GuiMenu/
    GuiContextMenu - hepsinin tip adinda "Menu" gecer)."""
    if depth > 5 or len(acc) >= 20:
        return
    comp_type = _try(lambda: comp.Type, "") or ""
    if "Menu" in comp_type:
        acc.append({
            "id": _try(lambda: comp.Id, "") or "",
            "type": comp_type,
            "text": (_try(lambda: comp.Text, "") or "").strip()[:120],
            "items": _menu_items(comp),
        })
        return
    children = _try(lambda: comp.Children)
    if children is None:
        return
    for i in range(_try(lambda: children.Count, 0) or 0):
        child = _try(lambda i=i: children.ElementAt(i))
        if child is not None:
            _collect_menus(child, acc, depth + 1)


def read_context_menu(session, element_id: str | None) -> dict:
    """TESHIS: bir elemanin sag tik menusunu acar ve ICINDEKILERI okumayi dener.

    SONUC (canli olcum, S4D / SE16N ALV grid, 2026-09-03): SAP BIR BAGLAM
    MENUSUNU BILESEN AGACINDA HIC GOSTERMIYOR. `contextMenu()` basariyla
    donuyor, oturum duruluyor, sonra elemanin/aktif pencerenin/ana pencerenin
    ALTINDA menu tipinde tek bir yeni dugum bile cikmiyor (`component: 0`).
    Bulunan tek menu ana menu cubugu (`wnd[0]/mbar`) - ve o TAMAMEN okunuyor,
    yani tarama calisiyor, ortada okunacak sey yok.

    Bu yuzden fonksiyon "menuyu listele" degil, IKI SEY yapar:
      - `menuBar`: ana menu cubugunu okur. Baglam menusu okunamadigi icin
        bu, agentin/kullanicinin GERCEKTEN okuyabildigi tek menudir - ayni
        islevler cogu ekranda oradan da erisilebilir.
      - `contextMenuExposed`: yukaridaki bulgunun REGRESYON KONTROLU. Bir gun
        (baska bir SAP GUI surumu, baska bir kontrol tipi) True donerse,
        menuyu tahmin etme donemi biter.

    Menude ne oldugunu ogrenmenin CALISAN yolu KONUM SONDALAMASIDIR:
    `selectContextMenuItem` + `by: "position"` gercek menuye karsi dogruluyor
    - "999"/"-5"/sacma bir deger 613 ile REDDEDILIYOR, gecerli bir konum
    calisiyor. Yani reddedilen konum zararsizdir, kabul edilen konum ISLEMI
    YAPAR. Ayni ALV'de olculen harita: 0/1/3/4/7/9 sessiz, 2/5/10 ayirac
    (reddedildi), 6 "Ara..." popup'i, 8 filtre popup'i, 11 "Export As".

    YAN ETKISI VAR: menuyu gercekten acar (`contextMenu()`). Salt okuma
    degildir; teshis amaciyla bilerek boyle.
    """
    comp = resolve_component(session, element_id)
    opened = False
    open_error = ""
    try:
        comp.contextMenu()
        opened = True
    except Exception as exc:  # noqa: BLE001
        open_error = _translate_com_error(exc)

    # ALV baglam menusunu SAP cogu zaman SUNUCUDA kuruyor - `contextMenu()`
    # donduginde menu daha var olmamis olabilir. Aramadan once oturumun
    # durulmasi beklenir; yoksa "menu yok" sonucu, menunun gercekten
    # okunamadigini degil, ERKEN BAKILDIGINI gosterirdi.
    _try(lambda: _settle(session, 2.0))

    menus: list = []
    seen_ids: set = set()
    probes: dict = {}
    for label, getter in (
        ("activeWindow", lambda: session.ActiveWindow),
        ("mainWindow", lambda: session.findById("wnd[0]")),
        ("component", lambda: comp),
    ):
        root = _try(getter)
        if root is None:
            probes[label] = None
            continue
        found: list = []
        _collect_menus(root, found)
        probes[label] = len(found)
        for menu in found:
            key = menu.get("id") or repr(menu)
            if key in seen_ids:
                continue
            seen_ids.add(key)
            menus.append(menu)

    # Ana menu cubugu ile "geri kalan" AYRILIR. Ayrilmasaydi `mbar` baglam
    # menusuymus gibi donerdi - okunan menuyu SAG TIK menusu sanmak, bu
    # teshisin engellemesi gereken tam da o hata olurdu.
    menu_bar = next((m for m in menus if m.get("id", "").endswith("/mbar")), None)
    others = [m for m in menus if m is not menu_bar]

    return {
        "elementId": _try(lambda: comp.Id, "") or (element_id or ""),
        "elementType": _try(lambda: comp.Type, "") or "",
        "opened": opened,
        "openError": open_error,
        "probes": probes,
        "contextMenuExposed": bool(others),
        "contextMenus": others,
        "menuBar": menu_bar,
        "note": (
            "SAP acik baglam menusunu bilesen agacinda GOSTERMIYOR (canli "
            "dogrulandi). Menude ne oldugunu ogrenmek icin selectContextMenuItem "
            "+ by='position' ile sondala: gecersiz konum 613 ile reddedilir "
            "(zararsiz), gecerli konum ISLEMI YAPAR."
        ) if not others else "",
    }


def _apply_context_menu(comp, payload: dict) -> None:
    """Sag tik menusunden bir oge sec - KOD, METIN veya KONUM ile.

    Onceden yalnizca `SelectContextMenuItem(<islev kodu>)` vardi ve bu pratikte
    KULLANILAMAZ bir yoldu: islev kodu ("&XXL" gibi) ekranda hicbir yerde
    yazmiyor, kullanicinin bilmesinin bir yolu yok ve her yanlis tahmin SAP'den
    "The method got an invalid argument [613]" olarak donuyor - yani ne yanlis
    oldugunu da soylemiyor. Canli bir ALV'de "&FIND" ve "&OPTIMIZE" denendi,
    ikisi de 613 verdi (2026-09-03).

    SAP'nin kendi API'sinde bunun karsiligi zaten var: menude GORUNEN metinle
    (`SelectContextMenuItemByText`) veya sirasiyla
    (`SelectContextMenuItemByPosition`) secmek.

    UCU DE CANLI DOGRULANDI (S4D / SE16N ALV grid, 2026-09-03) - hepsi
    GOZLENEBILIR bir sonuc uretti, yani "OK dondu" ile yetinilmedi:
      code     "&XXL"     -> "Export As" popup'i
      position "6"        -> "Ara..." popup'i;  "8" -> filtre;  "11" -> Export As
      text     "Ara..."   -> ayni "Ara..." popup'i
    Reddedilenler de bilgi: konum "999"/"-5"/sacma bir deger 613 aliyor,
    "2"/"5"/"10" ise MENU AYIRACLARI oldugu icin reddediliyor.

    METIN YONTEMININ TUZAGI: menude yazan etiket, ACTIGI EKRANIN BASLIGI
    DEGILDIR. Ayni ogenin etiketi "Ara...", actigi popup'in basligi "Bul".
    "Bul", "Bul...", "Find...", "Ayrintilar" gibi mantikli dokuz tahminin
    HEPSI reddedildi; calisan tek deger menude gercekten yazan "Ara..." idi.
    Yani metin yontemi, metni GERCEKTEN goren biri icindir; gormeyen icin
    guvenilir yol KONUM SONDALAMASIDIR (bkz. `read_context_menu`).
    """
    mode = str(payload.get("by") or "code").strip().lower()
    if mode not in CONTEXT_MENU_MODES:
        raise SapGuiScriptingError(
            f"Bilinmeyen sag tik secim yontemi: {mode!r}. Desteklenen: {list(CONTEXT_MENU_MODES)}."
        )
    value = payload.get("value", "")
    if value in (None, ""):
        raise SapGuiScriptingError("'value' bos - secilecek menu ogesi verilmedi.")
    # MENU ONCE ACILIR. `selectContextMenuItem` tek basina cagrildiginda ACIK
    # BIR MENU yoksa SAP 613 ile reddediyor - ve reddi "gecersiz argüman"
    # dedigi icin, sorun degerde saniliyor. Canli bir ALV'de bes ayri kod ve
    # metin denendi, hepsi 613 verdi; eksik olan degerler degil bu cagriydi
    # (2026-09-03). SAP'nin kendi kayit ciktisi da hep bu ikili sirayi uretir:
    #   grid.contextMenu
    #   grid.selectContextMenuItem "&XXL"
    # Menusu olmayan elemanlarda `contextMenu` yok - o durumda sessizce
    # atlanip dogrudan secim deneniyor.
    _try(lambda: comp.contextMenu())
    try:
        if mode == "text":
            comp.SelectContextMenuItemByText(str(value))
        elif mode == "position":
            comp.SelectContextMenuItemByPosition(str(value))
        else:
            comp.SelectContextMenuItem(str(value))
    except Exception as exc:  # noqa: BLE001
        sap_code, _ = _sap_error_detail(exc)
        if sap_code == SAP_ERR_INVALID_ARGUMENT:
            what = {
                "code": "islev kodu",
                "text": "menu metni",
                "position": "menu konumu",
            }[mode]
            raise SapGuiScriptingError(
                f"SAP bu {what} degerini tanimadi: {value!r}. "
                + (
                    "Islev kodlari ('&XXL' gibi) ekranda hicbir yerde yazmaz."
                    if mode == "code"
                    else "Menude yazan etiket, actigi ekranin basligiyla AYNI DEGIL "
                    "(orn. etiket 'Ara...', popup basligi 'Bul') - baslikten tahmin etme."
                    if mode == "text"
                    else "Bu konumda oge yok; menu ayiraclari da reddedilir."
                )
                + " Menu icerigi OKUNAMIYOR (SAP acik menuyu bilesen agacinda "
                "gostermiyor); dogru degeri bulmanin calisan yolu 'position' ile "
                "0'dan baslayarak sondalamaktir - gecersiz konum zararsizca reddedilir."
            ) from exc
        raise


def _apply_double_click(comp, payload: dict) -> None:
    """Cift tiklama - ALV grid'de SATIR+SUTUN ISTER.

    `comp.DoubleClick()` parametresiz cagriliyordu ve bir ALV uzerinde her
    zaman patliyordu: COM "Parameter not optional." diyor, bu da SAP'nin
    kendi mesaji olmadigi icin kullanicinin onune "scripting acik mi"
    kontrol listesi cikiyordu - tamamen yanlis yere bakmasi soylenmis
    oluyordu (canli SE16N/VBFA ALV'sinde dogrulandi, 2026-09-03).

    GuiGridView.doubleClick(row, column) imzasi zorunlu; digerlerinde
    (GuiTextField, GuiShell'in grid olmayan turleri) parametresiz form
    dogru olan. Bu yuzden tip once okunuyor.
    """
    comp_type = _try(lambda: comp.Type, "") or ""
    sub_type = _try(lambda: comp.SubType, "") or ""
    is_alv = comp_type == "GuiGridView" or (comp_type == "GuiShell" and sub_type == "GridView")

    if not is_alv:
        comp.DoubleClick()
        return

    row = payload.get("row")
    if row is None or row == "":
        raise SapGuiScriptingError(
            "ALV grid'de cift tiklama icin 'row' (0 tabanli satir numarasi) "
            "gerekli. 'column' verilmezse gridin ilk sutunu kullanilir."
        )
    column = payload.get("column")
    if column in (None, ""):
        cols = _try(lambda: list(comp.ColumnOrder), []) or []
        if not cols:
            raise SapGuiScriptingError(
                "Gridin sutun listesi okunamadi; 'column' alanini elle ver."
            )
        column = cols[0]
    comp.doubleClick(int(row), str(column))


def _apply_popup_choice(session, choice: str) -> None:
    key = (choice or "").strip().lower()
    if key not in POPUP_CHOICES:
        raise SapGuiScriptingError(f"Bilinmeyen popup seçimi: {choice!r}. Desteklenen: {sorted(POPUP_CHOICES)}.")
    window = _try(lambda: session.ActiveWindow)
    window_id = _try(lambda: window.Id, "") if window is not None else ""
    prefix = window_id or "wnd[1]"
    button_ids, vkey = POPUP_CHOICES[key]
    for suffix in button_ids:
        button = _try(lambda suffix=suffix: session.findById(f"{prefix}/{suffix}"))
        if button is not None:
            button.Press()
            return
    target = window if window is not None else session.findById("wnd[0]")
    target.sendVKey(vkey)


def handle_action(application, conn_idx: int, sess_idx: int, payload: dict) -> dict:
    action = payload.get("action")
    if action not in ALLOWED_ACTIONS:
        raise SapGuiScriptingError(f"Bilinmeyen aksiyon: {action!r}. Desteklenen: {sorted(ALLOWED_ACTIONS)}.")
    session = resolve_session(application, conn_idx, sess_idx)
    element_id = payload.get("id")

    try:
        if action == "navigate":
            _apply_navigate(session, str(payload.get("value", "")))
        elif action == "popupChoice":
            _apply_popup_choice(session, str(payload.get("value", "")))
        elif action == "sendVKey":
            # HEDEF: AKTİF pencere, `wnd[0]` DEĞİL. Modal bir pencere açıkken
            # (SE16N'de bir ALV satırına çift tıklayınca gelen "Ayrıntı
            # görüntüsü" wnd[1]'dir) `wnd[0]` modalin ARKASINDA kalıyor ve SAP
            # oraya giden tuşu 617 ile reddediyor. Ortaya çıkan mesaj da
            # kendi içinde çelişiyordu: "F3 etkin değil ... şu an etkin
            # olanlar: Geriye (F3)" - çünkü araç çubuğu okuması aktif
            # pencereye, tuş ise wnd[0]'a bakıyordu (canlı doğrulandı,
            # 2026-09-03). Dosyanın geri kalanı zaten ActiveWindow kullanıyor.
            if element_id:
                target = resolve_component(session, element_id)
            else:
                target = _try(lambda: session.ActiveWindow) or session.findById("wnd[0]")
            target.sendVKey(int(payload.get("vkey", 0)))
        else:
            if not element_id:
                raise SapGuiScriptingError("'id' alanı zorunlu (sendVKey/navigate/popupChoice dışındaki tüm aksiyonlar için).")
            # `resolve_component` uzerinden: dogrudan `findById` cagirildiginda
            # 619 ("bu ekranda yok") oynatma icin anlamsiz olan genel COM
            # cevirisine dusuyordu. Kayitli adimin hangi elemanda takildigini
            # soyleyen mesaj orada.
            comp = resolve_component(session, element_id)
            if action == "setText":
                comp.Text = payload.get("value", "")
            elif action == "press":
                comp.Press()
            elif action == "select":
                comp.Select()
            elif action == "doubleClick":
                _apply_double_click(comp, payload)
            elif action == "selectContextMenuItem":
                _apply_context_menu(comp, payload)
            else:  # pragma: no cover
                raise SapGuiScriptingError(f"Aksiyon uygulanamadı: {action}")
    except SapGuiScriptingError:
        raise
    except Exception as exc:  # noqa: BLE001
        # Ham COM demeti kullanıcıya gitmesin - SAP'nin kendi mesajı çıkarılır
        # ve 617 için "bu ekranda o tuş yok" olarak ADLANDIRILIR. Bu bir
        # kod hatası değil, SAP'nin bilinçli reddi.
        sap_code, _sap_text = _sap_error_detail(exc)
        message = _translate_com_error(exc)
        if sap_code == SAP_ERR_VKEY_NOT_ENABLED:
            vkey = int(payload.get("vkey", 0))
            # Etiketi SAP'nin KENDİ tooltip'inden ver; tooltip'i olmayanlar
            # (soluk butonlar ve isimsiz iç fonksiyonlar) listeye alınmaz -
            # kullanıcıya "418, 423, 446" demek yardım değil gürültü olurdu.
            enabled = [
                k["tooltip"] for k in (_try(lambda: read_toolbar_keys(session), []) or [])
                if k.get("enabled") and k.get("tooltip")
            ]
            message = (
                f"Bu ekranda {vkey} numaralı tuş etkin değil - SAP onu araç çubuğunda "
                "soluk gösteriyor (ör. değiştirilecek bir şey yokken Kaydet). "
                "Bir kod hatası değil, SAP'nin reddi."
                + (f" Şu an etkin olanlar: {', '.join(enabled)}." if enabled else "")
            )
        raise SapGuiScriptingError(message) from exc

    # Bekleme BURADA yapılır ve raporlanır; oynatıcının adımlar arasına sabit
    # bir uyku koymasına gerek kalmasın diye (bkz. `_settle`).
    settle = _try(lambda: _settle(session)) or {"waitedMs": 0, "busySeen": False, "settled": True}
    # Ekran durumu okunamazsa aksiyon YİNE DE başarılıdır - okuma hatası
    # aksiyonu başarısız göstermemeli.
    screen = _try(lambda: describe_screen(session), {}) or {}
    return {"screen": screen, "settle": settle}


def run_bridge(host: str, port: int) -> None:
    pythoncom.CoInitialize()

    class _Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def log_message(self, *a):
            pass

        def _send_json(self, status: int, payload) -> None:
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _send_error(self, status: int, message: str) -> None:
            self._send_json(status, {"ok": False, "error": message})

        def do_GET(self):  # noqa: N802 (BaseHTTPRequestHandler sözleşmesi)
            parsed = urlsplit(self.path)
            path = parsed.path
            qs = parse_qs(parsed.query)

            if path in ("/health", "/__bridge_health"):
                self._send_json(200, {"ok": True, "server": "sap-gui-scripting-bridge"})
                return

            # BİLEREK `get_application()` guard'ının DIŞINDA: teşhis uç
            # noktası, scripting tamamen kapalıyken de cevap vermek zorunda.
            if path == "/preflight":
                try:
                    self._send_json(200, {"ok": True, "preflight": preflight()})
                except Exception as exc:  # noqa: BLE001
                    self._send_error(500, f"Preflight başarısız: {exc}")
                return

            # Oturumsuz ekran görüntüsü - BU DA guard'ın DIŞINDA, ve bilerek.
            # `window` yakalama COM'a hiç dokunmaz; scripting kapalıyken
            # çalışabilmesi onun tek varlık sebebi. Yalnızca oturum çözülebilen
            # bir rota altından erişilebilseydi, tam da işe yaradığı durumda
            # ulaşılamaz olurdu.
            if path == "/screenshot":
                method = (qs.get("method") or ["window"])[0]
                if method == "hardcopy":
                    self._send_error(400, "Oturumsuz yakalama yalnızca 'window' yöntemiyle olur - HardCopy bağlı bir DIAG oturumu ister.")
                    return
                try:
                    self._send_json(200, {"ok": True, **capture_screenshot(None, "window")})
                except SapGuiScriptingError as exc:
                    self._send_error(502, str(exc))
                except Exception as exc:  # noqa: BLE001
                    self._send_error(500, f"Ekran görüntüsü başarısız: {exc}")
                return

            try:
                application = get_application()
                if path == "/connections":
                    self._send_json(200, {"ok": True, "connections": handle_list_connections(application)})
                    return
                parts = [p for p in path.split("/") if p]
                if len(parts) == 3 and parts[0] == "connections" and parts[2] == "sessions":
                    conn_idx = int(parts[1])
                    self._send_json(200, {"ok": True, "sessions": handle_list_sessions(application, conn_idx)})
                    return
                if len(parts) == 4 and parts[0] == "session" and parts[3] == "node":
                    conn_idx = int(parts[1])
                    sess_idx = int(parts[2])
                    element_id = (qs.get("id") or [None])[0]
                    # `rows`/`rowOffset`: grid okumasinin satir penceresi.
                    # Bozuk bir deger SESSIZCE varsayilana dusmez - istenen
                    # pencere ile okunan pencere farkli olursa, okuyan taraf
                    # yanlis satir numarasiyla islem yapar.
                    def _int_param(key: str) -> int | None:
                        raw = (qs.get(key) or [None])[0]
                        if raw in (None, ""):
                            return None
                        try:
                            return int(raw)
                        except ValueError:
                            raise SapGuiScriptingError(f"'{key}' bir tam sayi olmali, gelen: {raw!r}")
                    rows_wanted = _int_param("rows")
                    row_offset = _int_param("rowOffset") or 0
                    self._send_json(200, {"ok": True, "node": handle_get_node(
                        application, conn_idx, sess_idx, element_id, rows_wanted, row_offset)})
                    return
                if len(parts) == 4 and parts[0] == "session" and parts[3] == "screen":
                    session = resolve_session(application, int(parts[1]), int(parts[2]))
                    # `keys=0` araç çubuğu taramasını atlar - o tarama ekran
                    # okumasının süresini birkaç katına çıkarıyor (ölçüm için
                    # ve tuş durumunun gerekmediği çağrılar için).
                    with_keys = (qs.get("keys") or ["1"])[0] != "0"
                    self._send_json(200, {"ok": True, "screen": describe_screen(session, with_keys)})
                    return
                # GET olmasina ragmen YAN ETKILI (menuyu acar) - teshis ucu.
                # POST altina konsaydi bir "aksiyon" gibi gorunur, kaydediciye
                # ve oynaticiya sizardi; bu ise oynatilacak bir adim degil,
                # bakilacak bir sey.
                if len(parts) == 4 and parts[0] == "session" and parts[3] == "contextmenu":
                    session = resolve_session(application, int(parts[1]), int(parts[2]))
                    element_id = (qs.get("id") or [None])[0]
                    self._send_json(200, {"ok": True, "contextMenu": read_context_menu(session, element_id)})
                    return
                if len(parts) == 4 and parts[0] == "session" and parts[3] == "screenshot":
                    session = resolve_session(application, int(parts[1]), int(parts[2]))
                    method = (qs.get("method") or ["auto"])[0]
                    self._send_json(200, {"ok": True, **capture_screenshot(session, method)})
                    return
                self._send_error(404, f"Bilinmeyen yol: {path}")
            except SapGuiScriptingError as exc:
                self._send_error(502, str(exc))
            except Exception as exc:  # noqa: BLE001 - bridge asla crash etmemeli
                self._send_error(500, f"Beklenmeyen hata: {exc}")

        def do_POST(self):  # noqa: N802
            parsed = urlsplit(self.path)
            path = parsed.path
            parts = [p for p in path.split("/") if p]
            clen = int(self.headers.get("Content-Length", 0) or 0)
            raw = self.rfile.read(clen) if clen else b"{}"
            try:
                payload = json.loads(raw.decode("utf-8") or "{}")
            except json.JSONDecodeError:
                self._send_error(400, "Gecersiz JSON govde.")
                return

            try:
                application = get_application()
                if len(parts) == 4 and parts[0] == "session" and parts[3] == "action":
                    conn_idx = int(parts[1])
                    sess_idx = int(parts[2])
                    result = handle_action(application, conn_idx, sess_idx, payload)
                    self._send_json(200, {"ok": True, **result})
                    return
                self._send_error(404, f"Bilinmeyen yol: {path}")
            except SapGuiScriptingError as exc:
                self._send_error(502, str(exc))
            except Exception as exc:  # noqa: BLE001
                self._send_error(500, f"Beklenmeyen hata: {exc}")

    srv = HTTPServer((host, port), _Handler)
    sys.stderr.write(
        f"[sap-gui-scripting-bridge] listening on http://{host}:{port}\n"
        f"[sap-gui-scripting-bridge] GET /health icin liveness kontrolu, GET /preflight icin teshis.\n"
    )
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        srv.shutdown()
    finally:
        pythoncom.CoUninitialize()


def main() -> None:
    import argparse

    ap = argparse.ArgumentParser(description="SAP GUI Scripting icin yerel HTTP+JSON koprusu")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8790)
    ap.add_argument("--preflight", action="store_true", help="Sunucu baslatmadan sadece teshis yaz ve cik")
    args, _unknown = ap.parse_known_args()

    if sys.platform != "win32":
        sys.stderr.write("[sap-gui-scripting-bridge] FAIL: SAP GUI Scripting sadece Windows'ta calisir.\n")
        sys.exit(1)

    if args.preflight:
        pythoncom.CoInitialize()
        try:
            print(json.dumps(preflight(), ensure_ascii=False, indent=2))
        finally:
            pythoncom.CoUninitialize()
        return

    run_bridge(args.host, args.port)


if __name__ == "__main__":
    main()
