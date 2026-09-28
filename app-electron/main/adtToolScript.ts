// adt-tool.ps1 — Python olmayan makineler için yedek ADT aracı (bkz. launcher.ts
// `testAdtToolScript`). launcher.ts'ten ayrıldı, çünkü o dosya Electron'a
// bağımlı; üretilen betiğin sertifika doğrulaması ise testte doğrudan
// kilitleniyor (tests/adtToolScript.test.ts).
//
// Sertifika kuralı Node tarafıyla (tlsPin.ts) AYNI: .NET'in zincir + host adı
// doğrulaması (Windows deposu) hatasızsa kabul; değilse sertifikanın SHA-256
// parmak izi `.conn_adt`'deki `ADT_SAP_CERT_SHA256`'ya eşitse kabul; yoksa ret.
// Eskiden `TrustAllCertsPolicy` her sertifikayı kabul ediyordu — Basic Auth
// başlığı araya giren herhangi bir sunucuya gidiyordu.
//
// Pin betiğe GÖMÜLMÜYOR, `.conn_adt`'den okunuyor: iki dosya her bağlanışta
// birlikte yeniden yazılıyor, ama kullanıcı pin'i NTT Studio'da onaylayıp
// yeniden bağlandığında tek doğru kaynak `.conn_adt` olsun diye.
//
// Callback C# ile (Add-Type) yazılıyor, scriptblock ile değil: .NET callback'i
// el sıkışmayı yapan iş parçacığında çağırıyor ve orada PowerShell runspace'i
// yoksa scriptblock "There is no Runspace available" ile düşüyor. Eski
// `TrustAllCertsPolicy` de aynı nedenle C#'tı.
export function buildAdtToolScript(): string {
  return `param(
    [Parameter(Mandatory=$true)][ValidateSet("package","raw","ping")]$Action,
    [string]$Package,
    [string]$Path,
    [string]$Method = "GET",
    [string]$QueryString = "",
    [string]$Body = ""
)

$ErrorActionPreference = "Stop"
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12

$connFile = Join-Path $PSScriptRoot ".conn_adt"
$conn = @{}
Get-Content $connFile | ForEach-Object {
    if ($_ -match '^\\s*#' -or $_ -match '^\\s*$') { return }
    if ($_ -match '^([A-Z_0-9]+)=(.*)$') { $conn[$matches[1]] = $matches[2] }
}

# Sertifika: zincir + host adı doğrulanıyorsa (SslPolicyErrors.None) kabul;
# değilse SHA-256 parmak izi .conn_adt'deki ADT_SAP_CERT_SHA256 ile aynıysa
# kabul; ikisi de değilse ret — Basic Auth başlığı hiç gönderilmez.
if (-not ([System.Management.Automation.PSTypeName]'NttStudioPinnedCertPolicy').Type) {
    Add-Type @"
using System;
using System.Net.Security;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
public static class NttStudioPinnedCertPolicy {
    public static string Pin = "";
    public static bool Validate(object sender, X509Certificate cert, X509Chain chain, SslPolicyErrors errors) {
        if (errors == SslPolicyErrors.None) { return true; }
        if (cert == null || String.IsNullOrEmpty(Pin)) { return false; }
        byte[] hash;
        using (SHA256 sha = SHA256.Create()) { hash = sha.ComputeHash(cert.GetRawCertData()); }
        string actual = BitConverter.ToString(hash).Replace("-", "");
        return String.Equals(actual, Pin, StringComparison.OrdinalIgnoreCase);
    }
}
"@
}
$__pin = [string]$conn['ADT_SAP_CERT_SHA256']
[NttStudioPinnedCertPolicy]::Pin = ($__pin -replace '[^0-9A-Fa-f]', '')
$__method = [NttStudioPinnedCertPolicy].GetMethod('Validate')
$__delegate = [Delegate]::CreateDelegate([System.Net.Security.RemoteCertificateValidationCallback], $__method)
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = $__delegate

$base = $conn['ADT_SAP_URL']
$user = $conn['ADT_SAP_USER']
$pass = $conn['ADT_SAP_PASSWORD']
$client = $conn['ADT_SAP_CLIENT']
$clientQuery = if ($client) { "sap-client=$client" } else { "" }

# SecureString DÜZ .NET ile kuruluyor, ConvertTo-SecureString ile DEĞİL.
#
# O cmdlet Microsoft.PowerShell.Security modülünde ve bu modül PowerShell 7
# kurulu makinelerde yüklenemiyor: PS7'nin modül klasörleri PSModulePath'e
# giriyor, Windows PowerShell 5.1 oradaki tip dosyasını da okuyor ve
# "System.Security.AccessControl.ObjectSecurity ... member is already present"
# çakışmasıyla modülü hiç açamıyor. Sonuç, script'in ilk satırlarında
# "The 'ConvertTo-SecureString' command was found ... but the module could not
# be loaded" — ölçüldü (2026-09-07, PS 5.1.26100 + PS 7.6.5 yan yana).
#
# Bu, self-test'in "BAŞARISIZ" demesinin gerçek sebebiydi ve sebebi SAP'ta,
# TLS'te ya da yetkide sanan herkesi yanlış yöne gönderiyordu.
#
# Aşağıdaki üç satır hiçbir modüle ihtiyaç duymuyor; SecureString ve
# PSCredential ikisi de çekirdek .NET tipleri.
$sec = New-Object System.Security.SecureString
foreach ($__ch in $pass.ToCharArray()) { $sec.AppendChar($__ch) }
$sec.MakeReadOnly()
$cred = New-Object System.Management.Automation.PSCredential($user, $sec)
$script:sess = $null

function Get-CsrfToken {
    $discUrl = if ($clientQuery) { "$base/sap/bc/adt/discovery?$clientQuery" } else { "$base/sap/bc/adt/discovery" }
    $r = Invoke-WebRequest -Uri $discUrl -Method GET \`
        -Credential $cred -Headers @{ Accept = '*/*'; 'X-CSRF-Token' = 'Fetch' } \`
        -SessionVariable sessLocal -UseBasicParsing
    $script:sess = $sessLocal
    return $r.Headers['x-csrf-token']
}

switch ($Action) {
    "ping" {
        $discUrl = if ($clientQuery) { "$base/sap/bc/adt/discovery?$clientQuery" } else { "$base/sap/bc/adt/discovery" }
        $r = Invoke-WebRequest -Uri $discUrl -Method GET -Credential $cred -Headers @{ Accept = '*/*' } -UseBasicParsing
        Write-Output "PING_OK $($r.StatusCode)"
    }
    "package" {
        if (-not $Package) { Write-Error "Package parametresi gerekli"; exit 1 }
        $csrf = Get-CsrfToken
        $url = "$base/sap/bc/adt/repository/nodestructure?parent_type=DEVC%2FK&parent_name=$Package&withShortDescriptions=true"
        if ($clientQuery) { $url += "&$clientQuery" }
        $r = Invoke-WebRequest -Uri $url -Method POST -WebSession $script:sess \`
            -Headers @{ 'X-CSRF-Token' = $csrf; Accept = '*/*' } \`
            -ContentType 'application/vnd.sap.as+xml; charset=UTF-8; dataname=null' -Body '' -UseBasicParsing
        Write-Output $r.Content
    }
    "raw" {
        if (-not $Path) { Write-Error "Path parametresi gerekli"; exit 1 }
        $sep = if ($QueryString) { if ($QueryString.StartsWith('?')) { '' } else { '?' } } else { '' }
        $url = "$base$Path$sep$QueryString"
        if ($Method -eq "GET") {
            $r = Invoke-WebRequest -Uri $url -Method GET -Credential $cred -Headers @{ Accept = '*/*' } -UseBasicParsing
        } else {
            $csrf = Get-CsrfToken
            $r = Invoke-WebRequest -Uri $url -Method $Method -WebSession $script:sess \`
                -Headers @{ 'X-CSRF-Token' = $csrf; Accept = '*/*' } \`
                -ContentType 'application/xml' -Body $Body -UseBasicParsing
        }
        Write-Output $r.Content
    }
}
`;
}
