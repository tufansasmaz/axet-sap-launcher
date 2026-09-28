import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildAdtToolScript } from "../app-electron/main/adtToolScript";

// adt-tool.ps1 eskiden `TrustAllCertsPolicy` ile HER sertifikayı kabul
// ediyordu; Basic Auth başlığı araya giren herhangi bir sunucuya gidiyordu.
// Bu testler betiğin kabul kuralını (zincir+host adı ya da pin) kaynaktan
// kilitliyor. Gerçek PowerShell 5.1 koşusu raporda (S3-rapor.md).
describe("adt-tool.ps1 sertifika kuralı", () => {
  const script = buildAdtToolScript();

  it("her sertifikayı kabul eden eski politika yok", () => {
    expect(script).not.toMatch(/TrustAllCerts/i);
    expect(script).not.toMatch(/return\s+true;\s*\}\s*\}/); // koşulsuz "true" dönen callback
    expect(script).not.toMatch(/CertificatePolicy\s*=/);
  });

  it("zincir hatasızsa kabul, değilse DER'in SHA-256'sı pin'le karşılaştırılıyor", () => {
    expect(script).toContain("errors == SslPolicyErrors.None");
    expect(script).toContain("SHA256.Create()");
    expect(script).toContain("cert.GetRawCertData()");
    expect(script).toContain("StringComparison.OrdinalIgnoreCase");
    // Pin boşsa zincir dışı her sertifika reddediliyor.
    expect(script).toMatch(/String\.IsNullOrEmpty\(Pin\)\)\s*\{\s*return false;/);
  });

  it("pin .conn_adt'deki ADT_SAP_CERT_SHA256'dan okunuyor ve anahtar deseni rakamı kabul ediyor", () => {
    expect(script).toContain("$conn['ADT_SAP_CERT_SHA256']");
    // `[A-Z_]+` bu anahtarı (içinde 2-5-6 var) hiç eşlemiyordu.
    expect(script).toContain("'^([A-Z_0-9]+)=(.*)$'");
    expect("ADT_SAP_CERT_SHA256=ab").toMatch(/^([A-Z_0-9]+)=(.*)$/);
  });

  it("callback C# (Add-Type) ile kuruluyor ve .conn_adt okunduktan SONRA", () => {
    expect(script).toContain("Add-Type @\"");
    expect(script).toContain("[System.Net.ServicePointManager]::ServerCertificateValidationCallback = $__delegate");
    expect(script.indexOf("Get-Content $connFile")).toBeLessThan(script.indexOf("ADT_SAP_CERT_SHA256"));
  });
});

// Y3 (2026-09-28): betik her sisteme (QA/PRD dahil) yazılıyor ve eskiden
// `-Method POST/PUT/DELETE -Body ...` ile CSRF token'ını kendisi alıp SAP'ye
// yazabiliyordu — onay penceresinin ve motorun kademe kapısının dışında.
// Gerçek PowerShell 5.1 koşusu (sahte yerel HTTP sunucusuyla) raporda
// (T2-rapor.md); burada kaynak kilitleniyor.
describe("adt-tool.ps1 salt okuma", () => {
  const script = buildAdtToolScript();
  const invokes = script.split(/\r?\n/).filter((l) => /Invoke-WebRequest|Invoke-RestMethod/i.test(l));

  it("yazan HTTP yöntemi hiçbir yerde yok", () => {
    expect(script).not.toMatch(/-Method\s+['"]?(POST|PUT|DELETE|PATCH|MERGE)\b/i);
    // Yöntem değişkenden geçmiyor: `-Method $Method` eski yazma yoluydu.
    expect(script).not.toMatch(/-Method\s+\$/);
  });

  it("CSRF token alan ya da gönderen satır yok", () => {
    expect(script).not.toMatch(/X-CSRF-Token/i);
    expect(script).not.toMatch(/Get-CsrfToken/);
  });

  it("her Invoke-WebRequest sabit GET ya da HEAD ile, gövdesiz", () => {
    expect(invokes.length).toBeGreaterThan(0);
    for (const line of invokes) {
      expect(line).toMatch(/-Method (GET|HEAD) /);
      expect(line).not.toMatch(/-Body\b|-InFile\b|-ContentType\b/);
    }
    expect(script).not.toMatch(/Invoke-RestMethod/i);
  });

  it("başka bir HTTP istemcisi yok", () => {
    expect(script).not.toMatch(/WebClient|HttpClient|WebRequest\]::Create|UploadString|UploadData|\bcurl\b|Start-BitsTransfer/i);
  });

  it("GET/HEAD dışı yöntem ve -Body, .conn_adt okunmadan ve ilk istekten önce exit 2 ile reddediliyor", () => {
    const gate = script.indexOf('if (($verb -ne "GET" -and $verb -ne "HEAD") -or $Body)');
    expect(gate).toBeGreaterThan(0);
    expect(script.indexOf("$verb = ([string]$Method).Trim().ToUpperInvariant()")).toBeLessThan(gate);
    const exit2 = script.indexOf("exit 2", gate);
    expect(exit2).toBeGreaterThan(gate);
    expect(exit2).toBeLessThan(script.indexOf("Get-Content $connFile"));
    expect(exit2).toBeLessThan(script.indexOf("Invoke-WebRequest"));
    // Mesaj yolu gösteriyor: 8787, DEV, onay penceresi.
    const msg = script.slice(gate, exit2);
    expect(msg).toContain("8787");
    expect(msg).toContain("DEV");
    expect(msg).toContain("onay penceresi");
  });

  it("çalışma anı mesajları ASCII (PS 5.1 BOM'suz dosyayı ANSI okuyor)", () => {
    const runtime = script.split(/\r?\n/).filter((l) => /Console\]::Error\.WriteLine|Write-Output|Write-Error/.test(l));
    expect(runtime.length).toBeGreaterThan(0);
    for (const line of runtime) expect(line).toMatch(/^[\x00-\x7F]*$/);
  });

  it("raw yolu '/' ile başlamak zorunda (kullanıcı-bilgisi hilesiyle başka sunucuya gitmesin)", () => {
    expect(script).toContain("if (-not $Path.StartsWith('/'))");
  });

  it("package eylemi POST isteyen nodestructure yerine GET quickSearch", () => {
    expect(script).not.toContain("/repository/nodestructure");
    expect(script).toContain("operation=quickSearch");
    expect(script).toContain("[uri]::EscapeDataString(");
  });
});

// Talimat metinleri: ajan betiği metinden öğreniyor. Eski "Yöntem 2"
// `-Method POST -Body "<xml>..."` örneği veriyordu; betik artık bunu
// reddediyor ama metin hâlâ öğretirse ajan başka bir yol arar.
describe("talimat metinlerinde yazma örneği yok", () => {
  const root = path.join(__dirname, "..");
  const read = (...p: string[]) => readFileSync(path.join(root, ...p), "utf8").replace(/\r\n/g, "\n");
  const launcher = read("app-electron", "main", "launcher.ts");
  const method2 = launcher.slice(launcher.indexOf("### Yöntem 2"), launcher.indexOf("## Talimatlar"));
  const preamble = read("app-electron", "main", "activeContext.ts");
  const skills = path.join("resources", "sap-toolkit", "sap-consultant", "skills");

  it("Yöntem 2: POST/PUT/DELETE örneği, -Body ve CSRF yok; salt okunur ve 8787/onay yolu yazıyor", () => {
    expect(method2.length).toBeGreaterThan(200);
    expect(method2).not.toMatch(/-Method\s+"?(POST|PUT|DELETE|PATCH)/i);
    expect(method2).not.toMatch(/-Body\s+"/);
    expect(method2).not.toMatch(/CSRF/i);
    expect(method2).not.toMatch(/sertifika bypass/i);
    expect(method2).toContain("SALT OKUNUR");
    expect(method2).toContain("SAP'a yazma yalnızca 8787 üzerinden, DEV'de onay penceresiyle");
  });

  it("Talimatlar: kendi HTTP isteğini kurma", () => {
    const talimat = launcher.slice(launcher.indexOf("## Talimatlar"));
    expect(talimat).toContain("SAP'a yazma yalnızca 8787'deki ADT sunucusu üzerinden, yalnızca DEV sistemde");
    expect(talimat).toContain("kendi HTTP isteğini kurma");
  });

  it("sohbet bağlamı: DEV dışında 'kullanıcıya sor' değil, salt okunur", () => {
    expect(preamble).not.toContain("yazma işlemi yapma, önce kullanıcıya sor");
    expect(preamble).toContain("SALT OKUNUR. Kullanıcı istese bile SAP'a yazma yok");
  });

  it.each([
    ["sap-adt", "SKILL.md"],
    ["sap-adt-readonly", "SKILL.md"]
  ])("%s/%s: NTT bloğu adt-tool.ps1'in salt okunur olduğunu ve tek yazma yolunu söylüyor", (dir, file) => {
    const text = read(skills, dir, file);
    expect(text).toContain("`adt-tool.ps1` salt okunur");
    expect(text).toContain("kendi HTTP isteğini kurma");
  });
});
