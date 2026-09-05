import { spawn, execFileSync } from "node:child_process";
import { existsSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { guessInstanceNumber } from "./adtDiscovery";
import type { SapService, SapLogonOpenResult } from "../shared/types";

// Eclipse ADT'nin "Open SAP GUI" eylemiyle aynı deneyim: SAP Logon'a hiç
// kayıt olmadan, doğru host/port/router'a doğrudan bağlanan, GERÇEK
// klasik/büyük SAP GUI logon ekranını (System/Client/User/Password/
// Language hepsi editable) açan bir SAP GUI penceresi açmak.
//
// **Kesin çözüm — `SAPgui.exe`'yi `sapshcut.exe`/`.sap` shortcut'ı hiç
// kullanmadan DOĞRUDAN çağırmak, İKİ AYRI pozisyonel argümanla**:
//   `SAPgui.exe "<routeString>" "<instanceNr>"`
// Bu, gerçek bir müşteri SAProuter'ına (Limak, `/H/<router>/S/3299`) karşı
// canlı test edilip ekran görüntüsüyle DOĞRULANDI — Client alanı önceden
// dolu ("100"), User/Password boş (SAP GUI'nin kendi native davranışı,
// Eclipse ADT'de de aynı), gerçek "New password"/klasik logon ekranı.
//
// Kritik format detayları (canlı testte netleşti, ikisi de ZORUNLU):
//   1. `routeString`, router'lı sistemlerde `<routerString>/H/<host>`
//      şeklinde, **SONUNDA `/S/<port>` OLMADAN** bitmeli — router'sız
//      sistemlerde sadece `/H/<host>`. Yani her durumda route string
//      `/H/<hedef-host>` ile biter, port hiç route string'e girmez.
//   2. Instance numarası (DIAG portundan hesaplanan 2 haneli sayı, örn.
//      3200 → "00") route string'in İÇİNE değil, **AYRI bir argüman**
//      olarak verilmeli. Route string içine `/S/sapdp<NN>` gömmek de
//      (önceki bir turda denendi) router'sız sistemlerde çalışıyordu ama
//      router'lı sistemlerde SAPgui.exe'nin route-string ayrıştırıcısını
//      şaşırtıp sessizce SAP Logon Pad'e düşürüyordu — İKİ AYRI ARGÜMAN
//      formatı ise her iki durumda da (router'lı/router'sız) doğru
//      çalıştığı canlı olarak doğrulandı, artık tek/birleşik kod yolu.
//   3. `SAP GUI Security` onay penceresi (bilinmeyen bir bağlantı hedefi
//      için ilk seferde çıkan standart uyarı) otomatik "Allow" beklemez —
//      kullanıcı elle onaylamalı, bu SAP GUI'nin kendi güvenlik davranışı,
//      launcher tarafından atlanamaz/atlanmamalı.
const COMMON_SAPSHCUT_PATHS = [
  "C:/Program Files (x86)/SAP/FrontEnd/SapGui/sapshcut.exe",
  "C:/Program Files/SAP/FrontEnd/SapGui/sapshcut.exe",
  "C:/Program Files (x86)/SAP/FrontEnd/SAPgui/sapshcut.exe",
  "C:/Program Files/SAP/FrontEnd/SAPgui/sapshcut.exe"
];

function findExecutableNear(sapShcutPath: string, exeName: string): string | null {
  const candidate = path.join(path.dirname(sapShcutPath), exeName);
  return existsSync(candidate) ? candidate : null;
}

export function findSapShcutPath(override?: string | null): string | null {
  if (override && existsSync(override)) return override;
  for (const candidate of COMMON_SAPSHCUT_PATHS) {
    const normalized = path.normalize(candidate);
    if (existsSync(normalized)) return normalized;
  }
  return null;
}

// SAPgui.exe'nin doğrudan çağrısı için route string + instance no.
// Router varsa route string routerString + /H/host ile biter (port yok);
// router yoksa sadece /H/host. İkinci eleman (instanceNr) her zaman ayrı
// bir argüman olarak spawn'a geçirilir — bkz. dosya başındaki canlı test
// notu, bu ikisinin ayrılması router'lı sistemlerde ZORUNLU.
function buildDirectRoute(service: SapService): { routeString: string; instanceNr: string } | null {
  if (!service.host || !service.port) return null;
  const instanceNr = guessInstanceNumber(service.port);
  if (!instanceNr) return null;
  const hostHop = `/H/${service.host}`;
  const routeString = service.routerString ? `${service.routerString}${hostHop}` : hostHop;
  return { routeString, instanceNr };
}

// **Sağlamlaştırma (2026-08-23) — "arkada unutulmuş eski logon/process"
// sınıfı sorunlar**: Kullanıcı canlı testte, önceki bir "SAP Logon'da Aç"
// denemesinden kalan gizli/yarım kalmış bir `saplogon.exe`/`SAPgui.exe`
// process'i arkada dururken yeni bir denemenin hiçbir şey açmadığını
// (veya sessizce başarısız olduğunu) gözlemledi. Kök sebep adayları, hepsi
// aynı anda ele alınıyor:
//   1. Önceki bir çalıştırmada `SW_HIDE` ile gizlenmiş "SAP Logon 800"
//      liste penceresi hâlâ canlı bir process'e bağlıyken, SAP GUI'nin
//      kendi tekil-instance (single-instance) IPC mekanizması yeni
//      `SAPgui.exe <route> <instanceNr>` çağrısını bu GİZLİ pencereye
//      yönlendirebiliyor — kullanıcı hiçbir şey görmüyor.
//   2. Ağ/DNS gecikmesi veya SAP GUI'nin kendi bir çökmesi yüzünden
//      hiçbir pencere açmadan askıda kalmış (zombie) bir
//      `saplogon.exe`/`SAPgui.exe`/`sapshcut.exe` process'i, aynı
//      tekil-instance kilidini tutmaya devam edip sonraki tüm denemeleri
//      bloklayabiliyor.
//   3. Önceki bir turun pencere-öne-getirme mantığı SADECE sabit İngilizce
//      başlık metinlerine (`"SAP"`, `"SAP GUI Security"`, `"SAP GUI*"`)
//      bakıyordu — SAP GUI Windows'un dilini/kullanıcının Windows dil
//      ayarını takip ettiği için (örn. Almanca/Fransızca kurumsal
//      makinelerde) bu başlıklar hiç eşleşmeyebilir, ya da bir oturum
//      başarıyla login olduktan sonra pencere başlığı sistem/kullanıcı
//      adına değişebilir — her iki durumda da pencere sessizce arkada
//      kalırdı.
// Çözüm: (a) her tıklamadan ÖNCE bir "preflight" temizliği — hem
// pencerelere sahip olmayan gerçek zombie process'leri hem de artık
// hiçbir aktif oturuma bağlı olmayan gizli "SAP Logon 800" pad'ini
// KAPATIYOR (sadece gizleme değil, kalıcı olarak sonlandırıyor — böylece
// bir dahaki `SAPgui.exe` çağrısı SIFIR bir instance ile başlar); (b)
// pencere eşleştirmesi artık başlık metni değil **sahip process adı**
// (`saplogon.exe`/`sapgui.exe`) bazlı — dil/lokalizasyondan bağımsız ve
// login sonrası başlık değişse de çalışır; (c) tıklamadan ÖNCE zaten açık
// olan (kullanıcının kendi başlattığı, dokunulmaması gereken) pencereler
// bir "baseline" olarak dışlanıyor — bu özellik sadece YENİ açılan
// pencereleri öne getirir, kullanıcının üzerinde çalıştığı var olan bir
// oturumun odağını çalmaz.
const SAP_GUI_PROCESS_NAMES = ["saplogon", "sapgui", "sapshcut"];

// **Canlı testte yakalanan kritik bulgu**: `saplogon.exe`, hiçbir aktif
// oturumu olmasa bile SÜREKLİ birkaç "dahili" (kullanıcıya hiç görünmeyen)
// top-level pencere tutar — tooltip pencereleri (`SAP GUI Tooltip`,
// `tooltips_class32`), IME pencereleri (`Default IME`, `MSCTFIME UI`), DDE
// sunucu penceresi (`DDE Server Window`), GDI+ hook penceresi (`GDI+ Window
// (saplogon.exe)`) ve odak-takip pencereleri (`WindowsFormsSapFocus`, boş
// başlıklı). Bunların hepsi boş başlıklı YA DA aşağıdaki sabit listedeki
// isimlerden biri — gerçek bir oturum/güvenlik diyaloğu bunlardan HİÇBİRİYLE
// eşleşmez (her zaman anlamlı, boş olmayan bir başlığı vardır). Bu listeyi
// hem "bayat pad'in altında hâlâ aktif bir oturum var mı?" kontrolünde hem
// de öne-getirme (foreground) watcher'ında kullanıyoruz — aksi halde (a)
// gerçekten session'sız, sadece kilit tutan bir `saplogon.exe`'yi hiçbir
// zaman "bayat" olarak tespit edemezdik (her zaman en az bu dahili
// pencerelere sahip olduğu için), (b) watcher bu görünmez/0-boyutlu dahili
// pencerelerden birini yanlışlıkla öne getirip gerçek oturum penceresinin
// odağını çalabilirdi.
const SAP_GUI_INFRA_TITLES = ["SAP Logon 800", "DDE Server Window", "This is a DataTip :)", "Default IME", "MSCTFIME UI"];

function psStringArrayLiteral(items: string[]): string {
  return items.map((s) => `"${s.replace(/"/g, '""')}"`).join(", ");
}

// Her iki PowerShell script'inde de aynı: bir pencere "gerçek" (kullanıcıya
// görünen, anlamlı) sayılır ANCAK VE ANCAK başlığı boş değilse VE yukarıdaki
// sabit dahili başlık listesinde değilse VE "GDI+ Window*" ile başlamıyorsa.
function psIsRealWindowExpr(titleVar: string): string {
  const infraLiteral = psStringArrayLiteral(SAP_GUI_INFRA_TITLES);
  return `(-not [string]::IsNullOrEmpty(${titleVar}) -and @(${infraLiteral}) -notcontains ${titleVar} -and ${titleVar} -notlike "GDI+ Window*")`;
}

interface PreflightResult {
  killedZombies: number;
  killedStalePad: boolean;
  baseline: string[];
}

const PREFLIGHT_TIMEOUT_MS = 4000;

function preflightCleanupSapGui(): PreflightResult {
  const fallback: PreflightResult = { killedZombies: 0, killedStalePad: false, baseline: [] };
  const dir = mkdtempSync(path.join(os.tmpdir(), "axet-saplogon-pre-"));
  const scriptPath = path.join(dir, "preflight.ps1");
  const targetNames = SAP_GUI_PROCESS_NAMES.map((n) => `"${n}"`).join(", ");
  const script = `
Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Runtime.InteropServices;
using System.Collections.Generic;
public class AxetPreflight {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    public static List<IntPtr> TopLevel() {
        var list = new List<IntPtr>();
        EnumWindows((h, l) => { list.Add(h); return true; }, IntPtr.Zero);
        return list;
    }
    public static string GetText(IntPtr h) {
        int len = GetWindowTextLength(h);
        var sb = new StringBuilder(len + 1);
        GetWindowText(h, sb, sb.Capacity);
        return sb.ToString();
    }
    public static uint GetPid(IntPtr h) {
        uint procId;
        GetWindowThreadProcessId(h, out procId);
        return procId;
    }
}
"@

$targetNames = @(${targetNames})
$windows = @()
foreach ($h in [AxetPreflight]::TopLevel()) {
    $ownerPid = [AxetPreflight]::GetPid($h)
    if ($ownerPid -eq 0) { continue }
    try { $proc = Get-Process -Id $ownerPid -ErrorAction Stop } catch { continue }
    if ($targetNames -notcontains $proc.ProcessName.ToLower()) { continue }
    $windows += [PSCustomObject]@{
        Handle = $h.ToString()
        OwnerPid = $ownerPid
        Title = [AxetPreflight]::GetText($h)
        Visible = [AxetPreflight]::IsWindowVisible($h)
    }
}

# 1) Zombie temizliği: hedef process adlarından, HİÇ bir top-level penceresi
#    olmayan (çökmüş/askıda kalmış, tekil-instance kilidini gereksiz tutan)
#    process'leri kalıcı olarak sonlandır. Sadece en az 6 saniyedir çalışan
#    process'ler dikkate alınır — az önce (bu veya paralel bir tıklamayla)
#    başlatılmış, henüz kendi penceresini açmamış NORMAL bir başlangıç
#    sürecini yanlışlıkla "zombie" sayıp öldürmemek için (SAPgui.exe'nin
#    pencere açması bazı makinelerde birkaç saniye sürebiliyor).
$pidsWithWindows = @($windows | Select-Object -ExpandProperty OwnerPid -Unique)
$killedZombies = 0
$now = Get-Date
Get-Process -ErrorAction SilentlyContinue | Where-Object { $targetNames -contains $_.ProcessName.ToLower() } | ForEach-Object {
    if ($pidsWithWindows -contains $_.Id) { return }
    try { $age = ($now - $_.StartTime).TotalSeconds } catch { $age = 999 }
    if ($age -lt 6) { return }
    try { Stop-Process -Id $_.Id -Force -ErrorAction Stop; $killedZombies++ } catch {}
}

# 2) Bayat pad temizliği: "SAP Logon 800" penceresi zaten gizliyse (önceki
#    bir çalıştırmadan kalma) ve o process'in başka HİÇBİR penceresi
#    (yani bağlı bir aktif oturumu) yoksa, process'i kalıcı olarak
#    sonlandır — sadece bekleyip tekil-instance kilidini tutan bir kalıntı.
#    En az 2 saniyedir çalışıyor olması şartı, çok hızlı art arda iki
#    tıklamanın birbirinin henüz gizlenmemiş penceresini yanlışlıkla
#    "bayat" sanmasını önler.
$killedStalePad = $false
$padWindows = @($windows | Where-Object { $_.Title -eq "SAP Logon 800" -and -not $_.Visible })
foreach ($pad in $padWindows) {
    $siblings = @($windows | Where-Object { $_.OwnerPid -eq $pad.OwnerPid -and $_.Handle -ne $pad.Handle -and ${psIsRealWindowExpr("$_.Title")} })
    if ($siblings.Count -ne 0) { continue }
    try { $proc = Get-Process -Id $pad.OwnerPid -ErrorAction Stop; $padAge = ($now - $proc.StartTime).TotalSeconds } catch { $padAge = 999 }
    if ($padAge -lt 2) { continue }
    try { Stop-Process -Id $pad.OwnerPid -Force -ErrorAction Stop; $killedStalePad = $true } catch {}
}

# 3) Baseline: kullanıcının zaten açık tuttuğu (bu tıklamadan ÖNCE var olan)
#    gerçek/görünür pencereler — bunlara sonradan dokunulmayacak, odakları
#    çalınmayacak.
$baseline = @($windows | Where-Object { $_.Visible -and $_.Title -ne "SAP Logon 800" } | Select-Object -ExpandProperty Handle)

[PSCustomObject]@{
    killedZombies = $killedZombies
    killedStalePad = $killedStalePad
    baseline = $baseline
} | ConvertTo-Json -Compress
`;
  try {
    writeFileSync(scriptPath, script, "utf-8");
    const stdout = execFileSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", scriptPath],
      { timeout: PREFLIGHT_TIMEOUT_MS, windowsHide: true, encoding: "utf-8" }
    );
    const parsed = JSON.parse(stdout.trim());
    const baselineRaw = parsed.baseline;
    const baseline = Array.isArray(baselineRaw) ? baselineRaw.map(String) : baselineRaw ? [String(baselineRaw)] : [];
    if (parsed.killedZombies > 0 || parsed.killedStalePad) {
      console.log("[sapLogon] preflight cleanup", { killedZombies: parsed.killedZombies, killedStalePad: parsed.killedStalePad });
    }
    return { killedZombies: Number(parsed.killedZombies) || 0, killedStalePad: Boolean(parsed.killedStalePad), baseline };
  } catch (err) {
    // Preflight'ın kendisi başarısız olsa bile (PowerShell yok, zaman
    // aşımı, vb.) asıl "aç" akışını BLOKLAMIYORUZ — sadece temizlik/baseline
    // atlanır, en kötü durumda eski davranışa (baseline boş) düşülür.
    console.error("[sapLogon] preflight cleanup failed, continuing without it", err);
    return fallback;
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // best-effort, temp klasör OS tarafından zaten periyodik temizlenir
    }
  }
}

// SAP GUI'nin açtığı pencereler (önce "SAP GUI Security" onay diyaloğu,
// ardından gerçek "SAP" oturum penceresi) `SAPgui.exe`'nin kendi child
// process'inde açılır ve Windows'un normal "foreground lock" kısıtı
// yüzünden Electron penceresinin ÖNÜNE otomatik geçemez — arkada/altta
// kalır (kullanıcı canlı testte gözlemledi). Node'un kendisinde user32
// API'sine (SetForegroundWindow) FFI olmadan erişimi yok; bu proje zaten
// benzer durumlarda (sertifika trust için certutil, terminal kabuğu için
// powershell.exe) harici process çağırma deseni kullanıyor — aynı desen
// burada da izlendi: `AttachThreadInput` ile geçici olarak launcher'ın
// thread'ine "iğnelenip" SetForegroundWindow çağrısının Windows
// tarafından reddedilmesi önleniyor (bu, Windows'un kendi belgelenmiş
// "foreground window doesn't accept SetForegroundWindow from another
// thread unless attached" davranışının standart bir aşımı — görev
// çubuğu/başlatıcı uygulamaların da kullandığı resmi bir Win32 tekniği,
// hack değil).
//
// **Ek bulgu (canlı testte yakalandı)**: `SAPgui.exe`'ye iki pozisyonel
// argüman (route string + instance no) verildiğinde, SAPgui.exe bunu
// dahili olarak `saplogon.exe`'ye (SAP Logon Pad) devrediyor — Logon Pad
// hem gerçek oturum penceresini AÇIYOR hem de KENDİ "Connections" liste/
// ağaç ana penceresini ("SAP Logon 800" başlıklı) gösteriyor. Bu istenmeyen
// ikinci pencere kapatılmaya (WM_CLOSE) çalışılırsa SAP GUI "tüm oturumları
// kapat?" onayına düşme riski taşıyor (session'ı da etkileyebilir) — bunun
// yerine **`ShowWindow(SW_HIDE)`** ile sadece görsel olarak gizleniyor,
// `saplogon.exe` process'i (session'ın arkasında canlı kalması gerekebilir)
// hiç dokunulmuyor. Canlı doğrulandı: gizlendikten sonra gerçek "SAP"
// oturum penceresi sorunsuz çalışmaya devam ediyor. (Bu pencere artık her
// çağrıdan ÖNCE `preflightCleanupSapGui()` ile de kontrol ediliyor — bir
// öncekinden gizli kalmış ve artık hiçbir oturuma bağlı olmayanı process
// seviyesinde tamamen sonlandırılıyor, bkz. yukarıdaki fonksiyon.)
//
// **Pencere eşleştirme artık başlık metni değil, sahip process adı
// bazlı** (`saplogon.exe`/`sapgui.exe`) — dil/lokalizasyondan bağımsız,
// ve bir oturum login olup pencere başlığı değişse de çalışmaya devam
// eder. `baselineHandles`, bu çağrıdan ÖNCE zaten açık olan (kullanıcının
// kendi başlattığı) pencerelerin handle listesidir — bunlar asla
// force-foreground edilmez, sadece YENİ ortaya çıkan pencereler öne
// getirilir.
function spawnForegroundWatcher(baselineHandles: string[]): void {
  const dir = mkdtempSync(path.join(os.tmpdir(), "axet-saplogon-fg-"));
  const scriptPath = path.join(dir, "bring-to-front.ps1");
  const baselineArg = baselineHandles.join(",");
  const targetNames = ["saplogon", "sapgui"].map((n) => `"${n}"`).join(", ");
  const script = `
Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Runtime.InteropServices;
using System.Collections.Generic;
public class AxetForeground {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
    [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
    public const int SW_HIDE = 0;

    public static List<IntPtr> TopLevel() {
        var list = new List<IntPtr>();
        EnumWindows((h, l) => { list.Add(h); return true; }, IntPtr.Zero);
        return list;
    }
    public static string GetText(IntPtr h) {
        int len = GetWindowTextLength(h);
        var sb = new StringBuilder(len + 1);
        GetWindowText(h, sb, sb.Capacity);
        return sb.ToString();
    }
    public static uint GetPid(IntPtr h) {
        uint procId;
        GetWindowThreadProcessId(h, out procId);
        return procId;
    }
    public static void ForceForeground(IntPtr hWnd) {
        uint dummy;
        uint targetThread = GetWindowThreadProcessId(hWnd, out dummy);
        uint currentThread = GetCurrentThreadId();
        IntPtr fg = GetForegroundWindow();
        uint fgThread = fg == IntPtr.Zero ? 0 : GetWindowThreadProcessId(fg, out dummy);
        AttachThreadInput(currentThread, targetThread, true);
        if (fgThread != 0) AttachThreadInput(fgThread, targetThread, true);
        ShowWindow(hWnd, 9);
        SetForegroundWindow(hWnd);
        BringWindowToTop(hWnd);
        AttachThreadInput(currentThread, targetThread, false);
        if (fgThread != 0) AttachThreadInput(fgThread, targetThread, false);
    }
}
"@

$baselineRaw = "${baselineArg}"
$baseline = New-Object System.Collections.Generic.HashSet[string]
if ($baselineRaw) {
    foreach ($b in $baselineRaw -split ",") { if ($b) { [void]$baseline.Add($b) } }
}
$seen = New-Object System.Collections.Generic.HashSet[string]
$targetNames = @(${targetNames})
$deadline = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $deadline) {
    foreach ($h in [AxetForeground]::TopLevel()) {
        if (-not [AxetForeground]::IsWindowVisible($h)) { continue }
        $title = [AxetForeground]::GetText($h)
        if ($title -eq "SAP Logon 800") {
            [AxetForeground]::ShowWindow($h, [AxetForeground]::SW_HIDE)
            continue
        }
        if (-not ${psIsRealWindowExpr("$title")}) { continue }
        $key = $h.ToString()
        if ($baseline.Contains($key) -or $seen.Contains($key)) { continue }
        $ownerPid = [AxetForeground]::GetPid($h)
        if ($ownerPid -eq 0) { continue }
        try { $proc = Get-Process -Id $ownerPid -ErrorAction Stop } catch { continue }
        if ($targetNames -notcontains $proc.ProcessName.ToLower()) { continue }
        [void]$seen.Add($key)
        [AxetForeground]::ForceForeground($h)
    }
    Start-Sleep -Milliseconds 250
}
Remove-Item -LiteralPath "${scriptPath.replace(/\\/g, "\\\\")}" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "${dir.replace(/\\/g, "\\\\")}" -Force -Recurse -ErrorAction SilentlyContinue
`;
  try {
    writeFileSync(scriptPath, script, "utf-8");
    // `cmd /c start` ile spawn edilir — canlı testte doğrulandı, doğrudan
    // `spawn("powershell.exe", ...)` (detached:true olsa da) bazı Windows
    // ortamlarında (kısıtlayıcı Job Object'e sahip terminal/sandbox
    // kabukları) ana process ile aynı Job Object'e bağlı kalıp onunla
    // birlikte erken sonlandırılabiliyordu — güvenlik onayı için 10-15
    // saniye bekleyen gerçek bir kullanıcıda watcher hedefine ulaşamadan
    // ölüyordu. `cmd.exe /c start` Windows'un kendi resmi "yeni, bağımsız
    // bir process başlat" mekanizması (görev çubuğu/başlatıcıların da
    // kullandığı), Job Object'ten ayrışmayı garantiliyor.
    const watcher = spawn(
      "cmd.exe",
      ["/c", "start", "", "/min", "powershell.exe", "-NoProfile", "-WindowStyle", "Hidden", "-ExecutionPolicy", "Bypass", "-File", scriptPath],
      { detached: true, stdio: "ignore", windowsHide: true }
    );
    watcher.unref();
  } catch (err) {
    console.error("[sapLogon] foreground watcher failed to start", err);
  }
}

export function canOpenInSapLogon(service: SapService): boolean {
  // Cloud/BTP sistemlerde DIAG/SAP GUI protokolü yok (SAML SSO/HTTPS'ten
  // erişilir) — bu buton sadece host+DIAG port bilgisi olan (SAP Logon'dan
  // gelen veya manuel On-Premise) sistemlerde anlamlı.
  //
  // Cloud testi SADECE tipe bakıyor. Eskiden `manualAdtUrl` varlığı da cloud
  // sayılıyordu; on-prem sistemlere de ADT adresi girilebildiğinden bu artık
  // YANLIŞ olurdu — host+port'u olan bir on-prem sisteme ADT adresi girilir
  // girilmez "SAP Logon'da Aç" sessizce kaybolurdu. Aynı düzeltme
  // `launcher.ts`teki `isCloudSystem` için de yapıldı; ikisi aynı kural.
  // Görünürlük tarafındaki ikizi: `SystemPanel.tsx`.
  return Boolean(service.type !== "BTP/CLOUD" && service.host && service.port);
}

export function openInSapLogon(service: SapService, sapShcutOverride?: string | null): SapLogonOpenResult {
  const route = buildDirectRoute(service);
  if (!route) {
    console.error("[sapLogon] missingHostOrPort", { host: service.host, port: service.port });
    return { ok: false, reason: "missingHostOrPort" };
  }

  const sapShcutPath = findSapShcutPath(sapShcutOverride);
  if (!sapShcutPath) {
    console.error("[sapLogon] sapShcutNotFound", { sapShcutOverride });
    return { ok: false, reason: "sapShcutNotFound" };
  }
  const sapGuiPath = findExecutableNear(sapShcutPath, "SAPgui.exe") ?? findExecutableNear(sapShcutPath, "sapgui.exe");
  if (!sapGuiPath) {
    console.error("[sapLogon] sapGuiNotFound near", sapShcutPath);
    return { ok: false, reason: "sapShcutNotFound" };
  }

  // Her tıklamada önce zombie/bayat-pad temizliği + baseline hesaplama —
  // bkz. yukarıdaki "Sağlamlaştırma" notu. Bu adım kasıtlı olarak spawn'dan
  // ÖNCE, senkron çalışır: eski bir instance'ın tekil-instance kilidini
  // tutmaya devam etmesi ihtimaline karşı, yeni `SAPgui.exe` çağrısından
  // önce o kilidin temizlenmiş olması gerekiyor.
  const preflight = preflightCleanupSapGui();

  try {
    const child = spawn(sapGuiPath, [route.routeString, route.instanceNr], {
      detached: true,
      stdio: "ignore",
      windowsHide: false
    });
    child.unref();
    spawnForegroundWatcher(preflight.baseline);
    return { ok: true, reason: "opened" };
  } catch (err) {
    console.error("[sapLogon] spawn failed", err);
    return { ok: false, reason: "spawnError", detail: (err as Error).message };
  }
}
