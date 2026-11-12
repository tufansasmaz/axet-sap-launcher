// Beceri notlarında araç sayısı (kucukler-3 madde 3). Sayı tek yerde:
// app-electron/shared/adtSurface.ts. NTT Studio uyarlama notları (SKILL.md'deki
// `>` blokları) sayı yazmıyor — "yazma araç seti" / "salt okunur araç seti"
// diyor; böylece kit senkronunda sayı değişince not eskimiyor. Yukarı akış
// metni (blok dışı) taranmıyor: o metin bizim değil.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ADT_READONLY_TOOL_COUNT, ADT_WRITE_TOOL_COUNT } from "../app-electron/shared/adtSurface";

const ROOT = path.join(__dirname, "..");
const TOOLKIT = path.join(ROOT, "resources", "sap-toolkit");
const SKILLS = path.join(TOOLKIT, "sap-consultant", "skills");
const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");

function skillFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "__pycache__") continue;
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) skillFiles(p, out);
    else if (name === "SKILL.md") out.push(p);
  }
  return out;
}

// "33 araç", "motorun 33 aracı", "30 tools", "**30 tools**", "68 araçlık"
const COUNT = /\b\d{2}\*{0,2}\s+(araç|aracı|araçlık|tools?)(?!\p{L})/iu;

describe("SKILL.md uyarlama notlarında sabit araç sayısı yok", () => {
  it("hiçbir `>` satırı iki basamaklı araç sayısı yazmıyor", () => {
    const hits: string[] = [];
    for (const file of skillFiles(TOOLKIT)) {
      read(file)
        .split("\n")
        .forEach((line, i) => {
          if (line.startsWith(">") && COUNT.test(line)) hits.push(`${path.relative(ROOT, file)}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(hits).toEqual([]);
  });
});

describe("launcher sayıyı tek kaynaktan alıyor", () => {
  const launcher = read(path.join(ROOT, "app-electron", "main", "launcher.ts"));
  const manager = read(path.join(ROOT, "app-electron", "main", "adtReadonlyServerManager.ts"));

  it("etiket ve /health beklentisi sabitlerden, metinde sayı yok", () => {
    expect(launcher).toContain("${ADT_WRITE_TOOL_COUNT} araç");
    expect(launcher).toContain("${ADT_READONLY_TOOL_COUNT} araç");
    expect(launcher).not.toMatch(/\b(68|30) araç/);
    expect(manager).toContain("expected: String(opts.expectWritable ? ADT_WRITE_TOOL_COUNT : ADT_READONLY_TOOL_COUNT)");
  });

  it("onaylı sunucunun Python testi aynı sayıyı bekliyor", () => {
    const py = read(path.join(SKILLS, "sap-adt", "scripts", "test_gated_flow.py"));
    expect(py).toContain(`assert len(tools) == ${ADT_WRITE_TOOL_COUNT}, len(tools)`);
  });

  // Ölçüm: gerçek sunucuların `--list-tools` çıktısı (SAP'siz). Python ya da
  // `mcp` paketi yoksa atlanıyor.
  const list = (script: string, env: Record<string, string> = {}): number | null => {
    try {
      const out = execFileSync("py", [script, "--list-tools"], {
        cwd: mkdtempSync(path.join(tmpdir(), "surface-")),
        env: { ...process.env, ...env },
        encoding: "utf8",
        timeout: 60_000,
        stdio: ["ignore", "pipe", "ignore"]
      });
      return out.split("\n").filter((l) => l.trim()).length;
    } catch {
      return null;
    }
  };

  it("gerçek yüzeyler: onaylı = ADT_WRITE_TOOL_COUNT, salt okunur (SQL+dump açık) = ADT_READONLY_TOOL_COUNT", () => {
    const write = list(path.join(SKILLS, "sap-adt", "scripts", "adt_gated_server.py"));
    const ro = list(path.join(SKILLS, "sap-adt-readonly", "scripts", "adt_readonly_server.py"), {
      ADT_RO_ALLOW_SQL: "true",
      ADT_RO_ALLOW_DUMPS: "true",
      ADT_RO_ALLOW_DUMP_DETAIL: "true",
      ADT_RO_ALLOW_UNIT_TEST: ""
    });
    if (write === null || ro === null) return;
    expect(write).toBe(ADT_WRITE_TOOL_COUNT);
    expect(ro).toBe(ADT_READONLY_TOOL_COUNT);
  }, 120_000);
});
