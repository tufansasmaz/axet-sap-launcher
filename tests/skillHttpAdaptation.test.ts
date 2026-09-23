// ADT skill'lerindeki "MCP değil, HTTP" uyarlaması — senkron silerse bu test kırılsın.
//
// Ölçülen olay (2026-09-24, MAYA, DEV, 8787'de 33 araçlık sunucu ayakta): ajan
// "bu oturumda hiçbir SAP ADT aracı mevcut değil, bağlı değilim" dedi ve tek
// araç çağrısı yapmadı. Kurulu `sap-adt` SKILL.md'si yukarı akışın Claude Code
// metniydi — "Every SAP operation goes through the MCP tools (`adt_*`)" — ve
// aXet.code'da MCP yok. 1.6.7'deki "aXet.code edition" metni d2cb667'deki
// senkronla ezilmişti; ezildiğini hiçbir ekran göstermedi.
//
// Uyarlama iki yerde: `description` (ajan skill'i açmadan önce yalnızca bunu
// görüyor) ve gövdenin başı (açtığında ilk okuduğu yer).

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SKILLS = path.join(__dirname, "..", "resources", "sap-toolkit", "sap-consultant", "skills");
const read = (name: string) => readFileSync(path.join(SKILLS, name, "SKILL.md"), "utf8").replace(/\r\n/g, "\n");

/** Frontmatter'daki `description` bloğu. */
function description(skill: string): string {
  const m = /^---\n[\s\S]*?\ndescription: >\n([\s\S]*?)\n[a-z-]+:/.exec(skill);
  expect(m, "description bulunamadı").not.toBeNull();
  return m![1];
}

/** Frontmatter'dan sonraki ilk iki bin karakter — ajanın ilk okuduğu yer. */
function head(skill: string): string {
  const end = skill.indexOf("\n---\n", 4);
  return skill.slice(end, end + 2000);
}

describe.each(["sap-adt", "sap-adt-readonly"])("%s — ajan ADT'ye HTTP'den gidiyor", (name) => {
  const skill = read(name);

  it("description, araçların MCP olmadığını ve 8787'yi söylüyor", () => {
    const d = description(skill);
    expect(d).toContain("NOT MCP tools");
    expect(d).toContain("http://127.0.0.1:8787/tool/<name>");
  });

  it("gövdenin başında NTT Studio uyarlaması var: 8787, bearer token, 'bağlı değilim' değil", () => {
    const h = head(skill);
    expect(h).toContain("NTT Studio uyarlaması — MCP değil, HTTP");
    expect(h).toContain("POST http://127.0.0.1:8787/tool/adt_xxx");
    expect(h).toContain("Authorization: Bearer $ABAP_HTTP_TOKEN");
    expect(h).toContain("\"SAP'a bağlı değilim\" demek DEĞİL");
    // Token değeri hiçbir örnekte düz yazılmıyor, hep ortamdan okunuyor.
    expect(h).toContain("os.environ['ABAP_HTTP_TOKEN']");
  });
});

describe("SAP'a MCP üzerinden yazdığını söyleyen yardımcı skill'ler", () => {
  it("screen-gen: MCP aracı = 8787'ye POST", () => {
    expect(read("screen-gen")).toContain("POST http://127.0.0.1:8787/tool/adt_generate_screen");
  });

  it("sap-object-transfer: deploy script'inin 8786 varsayılanı burada yanlış, --port 8787", () => {
    expect(read("sap-object-transfer")).toContain("`--port 8787`");
  });
});
