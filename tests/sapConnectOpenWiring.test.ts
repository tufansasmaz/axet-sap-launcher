// SAP bağlanınca nerede açılsın — App.tsx bağlantısı (kaynak düzeyi; App
// tamamı jsdom'da kurulamayacak kadar büyük, bkz. browserIpcWiring.test.ts).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..");
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), "utf8").replace(/\r\n/g, "\n");
const app = read("src", "App.tsx");
const store = read("src", "stores", "terminalStore.tsx");

describe("SAP bağlanınca açılacak yer", () => {
  it("Bağlan düğmesi ayardaki seçimi alıyor; ayar yoksa Sohbet", () => {
    expect(app).toMatch(/openPreference=\{config\?\.sapConnectOpen \?\? "chat"\}/);
  });

  it("seçim rol kapısı ve sertifika yolunda da korunuyor (ref), varsayılan sohbet", () => {
    expect(app).toMatch(/const connectTargetRef = useRef<SapConnectTarget>\("chat"\);/);
    expect(app).toMatch(/target: SapConnectTarget = "chat"\s*\) => \{\s*if \(!credentialsTarget\) return;\s*connectTargetRef\.current = target;/);
  });

  it("sohbet: eski yol aynen; ajan/kabuk: Ajanlar ekranında bölme", () => {
    expect(app).toMatch(/if \(target === "chat"\) \{\s*setSapChatRequest\(\{ projectDir: result\.projectDir, label: title, notice, nonce: Date\.now\(\) \}\);\s*setActivity\("axetCode"\);/);
    expect(app).toMatch(/setSapPaneRequest\(\{[\s\S]{0,260}kind: target === "agent" \? "agent" : "shell"\s*\}\);\s*setActivity\("terminal"\);/);
    expect(app).toMatch(/sapPaneRequest=\{sapPaneRequest\}/);
  });

  it("bölme isteği şifre ya da jeton taşımıyor", () => {
    const block = app.match(/setSapPaneRequest\(\{[\s\S]*?\}\);/)?.[0] ?? "";
    expect(block).not.toMatch(/password|token|credential/i);
    const type = store.match(/export interface SapPaneRequest \{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(type).not.toMatch(/password|token|credential/i);
  });
});
