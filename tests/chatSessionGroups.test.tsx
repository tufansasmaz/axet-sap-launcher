// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  activeGroupKeys,
  filterSessions,
  GENERAL_GROUP_KEY,
  groupSessions,
  normalizeSessionQuery,
  orderSessions,
  PROJECTS_SECTION_KEY,
  SAP_SECTION_KEY,
  type GroupableSession
} from "../src/lib/chatSessionGroups";
import type { ChatProject } from "../app-electron/shared/types";

function s(id: string, over: Partial<GroupableSession> = {}): GroupableSession {
  return { id, title: id, messages: [], updatedAt: 0, cwd: null, sapLabel: null, projectId: null, keepInGeneral: false, ...over };
}
const P1: ChatProject = { id: "p1", name: "Proje A", instructions: "", createdAt: 10, updatedAt: 10 };
const P2: ChatProject = { id: "p2", name: "Proje B", instructions: "", createdAt: 20, updatedAt: 20 };

describe("chatSessionGroups", () => {
  it("en yeni sohbet önce", () => {
    const ordered = orderSessions([s("a", { updatedAt: 1 }), s("b", { updatedAt: 3 }), s("c", { updatedAt: 2 })]);
    expect(ordered.map((x) => x.id)).toEqual(["b", "c", "a"]);
  });

  it("arama başlıkta ve mesajlarda, Türkçe küçük harfle", () => {
    const list = [
      s("a", { title: "İstanbul raporu" }),
      s("b", { title: "x", messages: [{ content: "ISTASYON listesi" }] }),
      s("c", { title: "başka" })
    ];
    expect(normalizeSessionQuery("  İSTANBUL ")).toBe("istanbul");
    expect(filterSessions(list, normalizeSessionQuery("İSTANBUL")).map((x) => x.id)).toEqual(["a"]);
    expect(filterSessions(list, normalizeSessionQuery("listesi")).map((x) => x.id)).toEqual(["b"]);
    expect(filterSessions(list, "")).toHaveLength(3);
  });

  it("proje, SAP klasörü ve genel gruplarına ayırıyor", () => {
    const g = groupSessions(
      [
        s("p", { projectId: "p1" }),
        s("sap1", { cwd: "C:\\sap\\S4D", sapLabel: "S4D · 100", updatedAt: 5 }),
        s("sap2", { cwd: "c:\\SAP\\s4d", updatedAt: 4 }),
        s("gen", {}),
        s("kept", { cwd: "C:\\sap\\S4D", keepInGeneral: true })
      ],
      [P1],
      false
    );
    expect(g.projectGroups.map((x) => [x.key, x.sessions.map((y) => y.id)])).toEqual([["p1", ["p"]]]);
    expect(g.sapGroups).toHaveLength(1);
    expect(g.sapGroups[0].label).toBe("S4D · 100");
    expect(g.sapGroups[0].sessions.map((x) => x.id)).toEqual(["sap1", "sap2"]);
    expect(g.general.map((x) => x.id)).toEqual(["gen", "kept"]);
  });

  it("SAP grubunun etiketi yoksa klasör adı", () => {
    const g = groupSessions([s("a", { cwd: "C:\\work\\DS4\\" })], [], false);
    expect(g.sapGroups[0].label).toBe("DS4");
  });

  it("silinmiş projeye işaret eden sohbet kaybolmuyor: klasörü varsa SAP grubunda, yoksa genelde", () => {
    const g = groupSessions([s("withCwd", { projectId: "gone", cwd: "C:\\sap\\S4D" }), s("noCwd", { projectId: "gone" })], [P1], false);
    expect(g.projectGroups[0].sessions).toHaveLength(0);
    expect(g.sapGroups[0].sessions.map((x) => x.id)).toEqual(["withCwd"]);
    expect(g.general.map((x) => x.id)).toEqual(["noCwd"]);
  });

  it("boş proje aramada gizleniyor, aramasızken görünüyor", () => {
    expect(groupSessions([], [P1, P2], false).projectGroups.map((x) => x.key)).toEqual(["p2", "p1"]);
    expect(groupSessions([], [P1, P2], true).projectGroups).toHaveLength(0);
  });

  it("etkin sohbetin açılması gereken grup anahtarları", () => {
    expect(activeGroupKeys(s("a", { projectId: "p1" }), [P1])).toEqual([PROJECTS_SECTION_KEY, "p1"]);
    expect(activeGroupKeys(s("a", { projectId: "gone" }), [P1])).toEqual([GENERAL_GROUP_KEY]);
    expect(activeGroupKeys(s("a", { cwd: "C:\\SAP\\S4D" }), [])).toEqual([SAP_SECTION_KEY, "c:\\sap\\s4d"]);
    expect(activeGroupKeys(s("a", { cwd: "C:\\SAP\\S4D", keepInGeneral: true }), [])).toEqual([GENERAL_GROUP_KEY]);
  });
});
