// Basic Auth baytları + ASCII dışı şifrenin teşhisi.
//
// Bu dosyanın koruduğu asıl şey bir GERİ DÖNÜŞ: kod bir süre şifreden kod
// sayfası TAHMİN etti (ASCII dışı karakter varsa ISO-8859-9/ISO-8859-1).
// Ölçüm onu çürüttü — 2026-09-23, DS4: SAP GUI'nin kabul ettiği Türkçe
// karakterli şifre, HTTP/ADT kanalında hem UTF-8 hem ISO-8859-9 baytlarıyla
// 401 aldı ve kullanıcı kilitli değildi. Ölçümün desteklemediği bir bayt
// dönüşümü hiç olmamasından kötü: gönderileni öngörülemez kılıyor. O yüzden
// burada UTF-8'in dışına çıkılmadığı test ediliyor.
//
// `.ts` (`.tsx` değil): `app-electron/main`'den import ediyor, node
// tsconfig'ine ait.

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { encodeBasicCredentials, hasNonAscii, nonAsciiChars } from "../app-electron/main/basicAuth";

/** base64'ü geri açıp GÖNDERİLEN baytları görmek — asıl sözleşme bu. */
const bytesOf = (b64: string): number[] => Array.from(Buffer.from(b64, "base64"));

describe("baytlar hep UTF-8", () => {
  it("ASCII şifre eski koddaki baytların AYNISINI üretir", () => {
    const legacy = Buffer.from("SAPUSER:Passw0rd1*").toString("base64");
    expect(encodeBasicCredentials("SAPUSER", "Passw0rd1*")).toBe(legacy);
  });

  it("`ı` UTF-8'de iki bayt (C4 B1) — Latin-1'e DÜŞMÜYOR", () => {
    // `Buffer.from("ı", "latin1")` sessizce 0x31 ("1") üretir; yani bir
    // Latin-1 kaçamağı hatasız biçimde YANLIŞ şifre gönderirdi.
    expect(bytesOf(encodeBasicCredentials("u", "ı"))).toEqual([0x75, 0x3a, 0xc4, 0xb1]);
    expect(bytesOf(encodeBasicCredentials("u", "ı"))).not.toContain(0x31);
  });

  it("ISO-8859-9'a özgü baytlar (FD FE F0 D0 DD DE) hiç üretilmiyor", () => {
    // Bunlar kaldırılan tahminin imzasıydı. Biri geri gelirse test düşer.
    const bytes = bytesOf(encodeBasicCredentials("SAPUSER", "Yılbaşı1*"));
    for (const byte of [0xfd, 0xfe, 0xf0, 0xd0, 0xdd, 0xde]) {
      expect(bytes).not.toContain(byte);
    }
  });

  it("kod sayfası parametresi YOK — imza tek bir dizge döndürüyor", () => {
    // Eski imza `{ value, charset, unsupported }` döndürüyordu; çağıranların
    // hâlâ bir nesne beklemediğinden emin ol.
    expect(typeof encodeBasicCredentials("u", "p")).toBe("string");
    expect(encodeBasicCredentials.length).toBe(2);
  });
});

describe("ASCII dışı karakter teşhisi", () => {
  it("saf ASCII şifrede hiçbir şey raporlanmıyor", () => {
    expect(hasNonAscii("Passw0rd1*")).toBe(false);
    expect(nonAsciiChars("Passw0rd1*")).toEqual([]);
  });

  it("ölçülen vakanın şekli: Türkçe harfler adlarıyla listeleniyor", () => {
    expect(hasNonAscii("Yılbaşı1*")).toBe(true);
    expect(nonAsciiChars("Yılbaşı1*")).toEqual(["ı", "ş"]);
  });

  it("aynı harf iki kez geçse de bir kez raporlanıyor", () => {
    expect(nonAsciiChars("şşş")).toEqual(["ş"]);
  });

  it("Türkçe olmayan ASCII dışı karakterler de yakalanıyor", () => {
    expect(nonAsciiChars("Passwörd★")).toEqual(["ö", "★"]);
  });
});

describe("uyarı metni kullanıcıya ulaşıyor", () => {
  const read = (...parts: string[]) => readFileSync(path.join(__dirname, "..", ...parts), "utf8");

  it("401 metni ASCII dışı şifreyi ayrı anlatıyor", () => {
    const discovery = read("app-electron", "main", "adtDiscovery.ts");
    expect(discovery).toContain("unauthorizedNonAscii");
    // Her iki yol da (doğrudan ve SAProuter üzerinden) aynı yardımcıdan geçmeli.
    expect(discovery.match(/unauthorizedMessage\(language, sid, client, nonAscii\)/g)?.length).toBe(2);
  });

  it("modal bağlanmadan ÖNCE uyarıyor (kilit sayacı yanmasın)", () => {
    const modal = read("src", "components", "CredentialsModal.tsx");
    expect(modal).toContain("credentialsModal.passwordNonAscii");
    expect(modal).toContain("--status-warning-border");
  });
});

describe("Python tarafıyla sözleşme", () => {
  const scripts = path.join(
    __dirname,
    "..",
    "resources",
    "sap-toolkit",
    "sap-consultant",
    "skills",
    "sap-adt",
    "scripts"
  );

  it("motor artık ASCII'ye zorlamıyor", () => {
    // Eski hâl `auth_string.encode('ascii')` idi: ASCII dışı şifrede bağlanmak
    // şöyle dursun, UnicodeEncodeError ile PATLIYORDU. Kod sayfası hikâyesinden
    // BAĞIMSIZ, gerçek bir hataydı; düzeltmesi kalıyor.
    const lib = readFileSync(path.join(scripts, "sap_adt_lib.py"), "utf8");
    expect(lib).not.toMatch(/auth_string\.encode\('ascii'\)/);
    expect(lib).toContain("encode_basic_credentials");
  });

  it("iki auth yolu da aynı fonksiyondan geçiyor", () => {
    const modulePath = path.join(scripts, "credential_charset.py");
    expect(existsSync(modulePath)).toBe(true);
    const provider = readFileSync(path.join(scripts, "auth", "basic_auth_provider.py"), "utf8");
    expect(provider).not.toMatch(/credentials\.encode\('utf-8'\)/);
    expect(provider).toContain("encode_basic_credentials");
  });

  it("Python varsayılanı UTF-8 ve tahmin YAPMIYOR", () => {
    const py = readFileSync(path.join(scripts, "credential_charset.py"), "utf8");
    expect(py).toContain('DEFAULT_CHARSET = "utf-8"');
    // Tahmin fonksiyonu geri gelirse iki taraf yine ayrışır.
    expect(py).not.toContain("def choose_credential_charset");
    expect(py).toContain("ADT_SAP_PW_CHARSET");
  });

  it("launcher .conn_adt'a bir kod sayfası DAYATMIYOR", () => {
    // Satır artık yorumlu bir kaçış kapısı; etkin değer yazılırsa launcher ile
    // Python ayrı baytlar üretebilir ("uygulama bağlandı, ajan 401 aldı").
    const launcher = readFileSync(path.join(__dirname, "..", "app-electron", "main", "launcher.ts"), "utf8");
    expect(launcher).not.toMatch(/^ADT_SAP_PW_CHARSET=/m);
    expect(launcher).toContain("# ADT_SAP_PW_CHARSET=");
  });
});
