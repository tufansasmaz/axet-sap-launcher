// NTT Studio'nun bağlandığı sistem (adres/client/kullanıcı) iki yere gidiyor:
// `.conn_adt` ve 8787'deki sunucunun ortamı. Sunucu (`ntt_binding.py`) her
// araç çağrısında ikisini karşılaştırıyor; ikisi farklı kaynaktan hesaplanırsa
// meşru bağlantı da reddedilir, ya da daha kötüsü, ortama `.conn_adt`'dekinden
// farklı ama "kabul edilen" bir değer gider. Bu dosya ikisinin AYNI nesneden
// yazıldığını kilitliyor.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { applySapBindingEnv, SAP_BINDING_ENV, sapBindingFor, sapBindingKey } from "../app-electron/main/sapBinding";

const ROOT = path.resolve(__dirname, "..");
const launcher = readFileSync(path.join(ROOT, "app-electron", "main", "launcher.ts"), "utf8").replace(/\r\n/g, "\n");

const CREDS = { username: "DevUser", password: "gizli-deger", client: " 100 " };

describe("sapBindingFor", () => {
  it("doğrudan HTTPS: doğrulanan adres; client kırpılmış; kullanıcı `.conn_adt`'deki gibi", () => {
    expect(sapBindingFor(CREDS, "https://dev.example.invalid:44300")).toEqual({
      url: "https://dev.example.invalid:44300",
      client: "100",
      user: "DevUser"
    });
  });

  it("RFC köprüsü: yerel köprü adresi (motor oraya gidiyor)", () => {
    expect(sapBindingFor(CREDS, "https://dev.example.invalid:44300", 8788).url).toBe("http://127.0.0.1:8788");
  });

  it("nesnede parola yok", () => {
    const binding = sapBindingFor(CREDS, "https://dev.example.invalid");
    expect(JSON.stringify(binding)).not.toContain(CREDS.password);
    expect(Object.keys(binding).sort()).toEqual(["client", "url", "user"]);
  });

  it("anahtar: aynı değer aynı anahtar, bağlantı yoksa boş", () => {
    const a = sapBindingFor(CREDS, "https://x.invalid");
    expect(sapBindingKey(a)).toBe(sapBindingKey({ ...a }));
    expect(sapBindingKey({ ...a, user: "OTHER" })).not.toBe(sapBindingKey(a));
    expect(sapBindingKey(undefined)).toBe("");
  });
});

describe("applySapBindingEnv", () => {
  it("miras silinir, yalnızca bizimki konur; parola ve motor anahtarları gitmez", () => {
    const env: NodeJS.ProcessEnv = {
      NTT_STUDIO_SAP_URL: "https://prd.invalid",
      NTT_STUDIO_SAP_CLIENT: "999",
      ADT_SAP_URL: "https://prd.invalid",
      ADT_SAP_PASSWORD: "miras",
      PATH: "p"
    };
    applySapBindingEnv(env, sapBindingFor(CREDS, "https://dev.invalid"));
    expect(env).toEqual({
      PATH: "p",
      [SAP_BINDING_ENV.url]: "https://dev.invalid",
      [SAP_BINDING_ENV.client]: "100",
      [SAP_BINDING_ENV.user]: "DevUser"
    });
  });

  it("bağlantı yoksa üçü de yok", () => {
    const env: NodeJS.ProcessEnv = { NTT_STUDIO_SAP_URL: "https://prd.invalid", NTT_STUDIO_SAP_USER: "X" };
    applySapBindingEnv(env, null);
    expect(env).toEqual({});
  });
});

describe("launcher: `.conn_adt` ve sunucunun ortamı aynı nesneden", () => {
  const build = launcher.slice(launcher.indexOf("function buildConnAdt("), launcher.indexOf("function buildConnAdt(") + 12000);

  it("buildConnAdt adres/client/kullanıcı satırlarını bağlantı nesnesinden yazıyor", () => {
    expect(build).toMatch(/function buildConnAdt\(\s*req: ConnectRequest,\s*credentials: SystemCredentials,\s*binding: SapBinding,/);
    expect(build).toContain("const effectiveUrl = binding.url;");
    expect(build).toContain("ADT_SAP_URL=${effectiveUrl}");
    expect(build).toContain("ADT_SAP_USER=${binding.user}");
    expect(build).toContain("`ADT_SAP_CLIENT=${binding.client}\\n`");
    // Eski ayrı hesap geri gelmesin.
    expect(build).not.toContain("ADT_SAP_USER=${credentials.username}");
    expect(build).not.toContain("ADT_SAP_CLIENT=${credentials.client");
  });

  it("bağlanma akışı tek `sapBinding` hesaplıyor ve ikisine de onu veriyor", () => {
    expect(launcher.match(/sapBindingFor\(/g)?.length).toBe(1);
    expect(launcher).toContain("const sapBinding = sapBindingFor(credentials, finalUrl, rfcBridge?.bridgePort);");
    expect(launcher).toContain("buildConnAdt(req, credentials, sapBinding, finalUrl,");
    expect(launcher).toMatch(/attemptReadonlyServerAutoStart\([\s\S]*?\}, systemTier \?\? "QA", sapBinding\);/);
    expect(launcher).toMatch(/startReadonlyServer\(\{[\s\S]*?tier,\s*binding\s*\}\)/);
  });

  it("launcher onay token'ını ya da ADT token'ını kendisi taşımıyor", () => {
    expect(launcher).not.toContain("getAdtHttpToken");
    expect(launcher).not.toContain("ADT_APPROVAL_TOKEN");
  });
});
