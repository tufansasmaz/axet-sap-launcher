import { describe, expect, it } from "vitest";
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
