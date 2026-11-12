// Sohbet ajan seçicisi (kucukler-3 madde 5). Ölçüm (axet-code 1.5.1,
// 2026-11-12): `agent list --json` `mode` vermiyor; kullanıcı/proje ajanlarının
// `path`'i var ve tanım dosyasının ön bilgisinde `mode:` (primary | subagent |
// all) yazıyor. Yerleşik ajanların dosyası yok. Liste dosyadan türetiliyor;
// dosyası olmayan yerleşiklerde ölçülen iki ad (guide, task) kalıyor; yine de
// seçilen ajan "cannot be used as the main agent" ile düşerse sohbet anlaşılır
// mesaj veriyor ve seçimi varsayılana döndürüyor.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseAxetAgentList } from "../app-electron/main/agentEngineProbe";
import { isSubagentOnlyError } from "../app-electron/shared/agentErrors";
import { selectableAgents } from "../src/lib/axetAgents";
import { MAIN_TR } from "../app-electron/main/i18n/tr";
import { MAIN_EN } from "../app-electron/main/i18n/en";

const RAW = JSON.stringify([
  { name: "coder", scope: "builtin", permissions: "ask (default)", description: "" },
  { name: "guide", scope: "builtin", permissions: "ask (default)", description: "" },
  { name: "task", scope: "builtin", permissions: "ask (default)", description: "" },
  { name: "code-analyzer", scope: "user", permissions: "*=ask", path: "C:\\a\\code-analyzer.md", description: "" },
  { name: "helper", scope: "project", permissions: "*=ask", path: "C:\\a\\helper.md", description: "" },
  { name: "broken", scope: "user", permissions: "*=ask", path: "C:\\a\\yok.md", description: "" }
]);

const FILES: Record<string, string> = {
  "C:\\a\\code-analyzer.md": "---\ndescription: x\nmode: all\nmodel: large\n---\nbody",
  "C:\\a\\helper.md": "---\r\ndescription: y\r\nmode: \"subagent\"\r\n---\r\nmode: primary (gövde sayılmaz)"
};
const reader = (p: string) => {
  if (!(p in FILES)) throw new Error("ENOENT");
  return FILES[p];
};

describe("ajan kipi tanım dosyasından", () => {
  it("path'li ajanın mode'u ön bilgiden okunuyor; dosyası olmayanın mode'u yok", () => {
    const list = parseAxetAgentList(RAW, reader);
    const mode = (n: string) => list.find((a) => a.name === n)?.mode;
    expect(mode("code-analyzer")).toBe("all");
    expect(mode("helper")).toBe("subagent");
    expect(mode("broken")).toBeUndefined();
    expect(mode("coder")).toBeUndefined();
  });

  it("seçici: mode subagent olan ve dosyasız yerleşik guide/task gizli; gerisi görünür", () => {
    const names = selectableAgents(parseAxetAgentList(RAW, reader)).map((a) => a.name);
    expect(names).toEqual(["coder", "code-analyzer", "broken"]);
  });

  it("dosyalı bir ajan guide adını taşısa da mode'u primary ise seçilebilir", () => {
    const raw = JSON.stringify([{ name: "guide", scope: "project", permissions: "", path: "C:\\g.md", description: "" }]);
    const list = parseAxetAgentList(raw, () => "---\nmode: primary\n---\n");
    expect(selectableAgents(list).map((a) => a.name)).toEqual(["guide"]);
  });
});

describe("ana ajan olamayan seçim düşerse", () => {
  it("axet-code'un hatası tanınıyor", () => {
    expect(isSubagentOnlyError('Error: Agent "guide" cannot be used as the main agent (mode "subagent")')).toBe(true);
    expect(isSubagentOnlyError("Not authenticated")).toBe(false);
    expect(isSubagentOnlyError(undefined)).toBe(false);
  });

  it("anlaşılır mesaj tr/en, sohbet seçimi varsayılana döndürüyor", () => {
    expect(MAIN_TR["chat.agentSubagentOnly"]).toBe("Bu ajan yalnız alt ajan olarak çalışabilir; başka ajan seç. Seçim varsayılana döndü.");
    expect(MAIN_EN["chat.agentSubagentOnly"]).toBeTruthy();
    const chat = readFileSync(path.join(__dirname, "..", "app-electron", "main", "axetChat.ts"), "utf8");
    expect(chat).toContain("isSubagentOnlyError(raw)");
    expect(chat).toContain("agentRejected: true");
    const home = readFileSync(path.join(__dirname, "..", "src", "components", "AxetCodeHome.tsx"), "utf8");
    expect(home).toContain("if (result.agentRejected)");
  });
});
