// npm'in genel klasörü (%APPDATA%\npm) PATH'te değilse Araçlar'dan kurulan
// Claude Code / Gemini / Codex bulunamıyordu (kurulum başarılı, "kurulu değil").
import { describe, expect, it } from "vitest";
import { withToolDirs } from "../app-electron/main/toolPath";

const exists = (dirs: string[]) => (p: string) => dirs.includes(p);

describe("withToolDirs", () => {
  it("npm genel klasörü PATH'te yoksa sona ekleniyor", () => {
    const out = withToolDirs("C:\\Windows;C:\\Tools", { APPDATA: "C:\\Users\\u\\AppData\\Roaming" }, exists(["C:\\Users\\u\\AppData\\Roaming\\npm"]));
    expect(out).toBe("C:\\Windows;C:\\Tools;C:\\Users\\u\\AppData\\Roaming\\npm");
  });

  it("zaten varsa (büyük/küçük harf ve sondaki \\ farkıyla) tekrar eklenmiyor", () => {
    const path = "C:\\Windows;c:\\users\\u\\appdata\\roaming\\NPM\\";
    expect(withToolDirs(path, { APPDATA: "C:\\Users\\u\\AppData\\Roaming" }, exists(["C:\\Users\\u\\AppData\\Roaming\\npm"]))).toBe(path);
  });

  it("klasör diskte yoksa eklenmiyor", () => {
    expect(withToolDirs("C:\\Windows", { APPDATA: "C:\\Users\\u\\AppData\\Roaming" }, exists([]))).toBe("C:\\Windows");
  });

  it("Node.js'in kurulum klasörü de ekleniyor (Node yeni kurulduysa)", () => {
    const out = withToolDirs("C:\\Windows", { ProgramFiles: "C:\\Program Files" }, exists(["C:\\Program Files\\nodejs"]));
    expect(out).toBe("C:\\Windows;C:\\Program Files\\nodejs");
  });

  it("ortam değişkeni yoksa ya da PATH boşsa çökmüyor", () => {
    expect(withToolDirs(undefined, {}, exists([]))).toBe("");
    expect(withToolDirs("", { APPDATA: "C:\\R" }, exists(["C:\\R\\npm"]))).toBe("C:\\R\\npm");
  });
});
