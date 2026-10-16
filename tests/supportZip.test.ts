// Bağımlılıksız zip (spec 2026-10-16 §6). Python varsa onunla açılıyor; yoksa
// Node ile başlıklar ve CRC denetleniyor.
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { crc32, inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { buildZip } from "../app-electron/main/support/zipWriter";

const ENTRIES = [
  { name: "bilgi.json", data: Buffer.from('{"a":1}') },
  { name: "not-şçğ.txt", data: Buffer.from("Ne oldu: sohbet açılmıyor — çok yavaş.\n".repeat(50), "utf-8") }
];

describe("buildZip", () => {
  it("yerel başlık, merkezi dizin ve EOCD tutarlı; veri açılıyor", () => {
    const zip = buildZip(ENTRIES, new Date(2026, 9, 16, 14, 30, 10));
    expect(zip.readUInt32LE(0)).toBe(0x04034b50);
    const eocd = zip.length - 22;
    expect(zip.readUInt32LE(eocd)).toBe(0x06054b50);
    expect(zip.readUInt16LE(eocd + 10)).toBe(2);
    // İlk girdinin verisi: başlık 30 + ad uzunluğu sonrası, sıkıştırılmış boy kadar.
    const nameLen = zip.readUInt16LE(26);
    const compSize = zip.readUInt32LE(18);
    const raw = inflateRawSync(zip.subarray(30 + nameLen, 30 + nameLen + compSize));
    expect(raw.toString()).toBe('{"a":1}');
    expect(zip.readUInt32LE(14)).toBe(crc32(ENTRIES[0].data));
    // UTF-8 ad bayrağı
    expect(zip.readUInt16LE(6) & 0x0800).toBe(0x0800);
  });

  it("Python zipfile açabiliyor, Türkçe ad ve içerik doğru (Python yoksa atlanır)", () => {
    const probe = spawnSync("py", ["-3", "--version"], { encoding: "utf-8" });
    if (probe.status !== 0) return;
    const dir = mkdtempSync(path.join(tmpdir(), "zip-"));
    const file = path.join(dir, "t.zip");
    writeFileSync(file, buildZip(ENTRIES));
    const res = spawnSync(
      "py",
      ["-3", "-c", "import sys,zipfile,json;z=zipfile.ZipFile(sys.argv[1]);z.testzip();print(json.dumps({n:len(z.read(n)) for n in z.namelist()}))", file],
      { encoding: "utf-8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } }
    );
    expect(res.status).toBe(0);
    expect(JSON.parse(res.stdout)).toEqual({ "bilgi.json": 7, "not-şçğ.txt": ENTRIES[1].data.length });
  });
});
