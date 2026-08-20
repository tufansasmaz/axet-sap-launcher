import { spawn } from "node:child_process";
import { existsSync, writeFileSync, mkdtempSync } from "node:fs";
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
// oturum penceresi sorunsuz çalışmaya devam ediyor.
function spawnForegroundWatcher(): void {
  const dir = mkdtempSync(path.join(os.tmpdir(), "axet-saplogon-fg-"));
  const scriptPath = path.join(dir, "bring-to-front.ps1");
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

$seen = New-Object System.Collections.Generic.HashSet[string]
$deadline = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $deadline) {
    foreach ($h in [AxetForeground]::TopLevel()) {
        if (-not [AxetForeground]::IsWindowVisible($h)) { continue }
        $title = [AxetForeground]::GetText($h)
        if ($title -eq "SAP Logon 800") {
            [AxetForeground]::ShowWindow($h, [AxetForeground]::SW_HIDE)
            continue
        }
        if ($title -eq "SAP GUI Security" -or $title -eq "SAP" -or $title -like "SAP GUI*") {
            $key = "$h|$title"
            if (-not $seen.Contains($key)) {
                $seen.Add($key) | Out-Null
                [AxetForeground]::ForceForeground($h)
            }
        }
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
  return Boolean(!service.manualAdtUrl && service.host && service.port);
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

  try {
    const child = spawn(sapGuiPath, [route.routeString, route.instanceNr], {
      detached: true,
      stdio: "ignore",
      windowsHide: false
    });
    child.unref();
    spawnForegroundWatcher();
    return { ok: true, reason: "opened" };
  } catch (err) {
    console.error("[sapLogon] spawn failed", err);
    return { ok: false, reason: "spawnError", detail: (err as Error).message };
  }
}
