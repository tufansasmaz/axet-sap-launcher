// Bellek bildirimcisi (spec 2026-10-18 ajan-bellegi §3, §7): sahte saat,
// sahte izleyici; sonda gerçek izleyiciyle Görev Panosu sırası.
import { describe, expect, it, vi } from "vitest";
import { createAgentMonitor, type AgentPresence, type AgentPromptResult } from "../app-electron/main/agentMonitor";
import type { AgentReader } from "../app-electron/main/agentGenericReader";
import { createMemoryNotifier } from "../app-electron/main/memoryNotifier";
import type { MemoryEnsure } from "../app-electron/main/memoryFiles";
import { memoryPromptLine } from "../app-electron/shared/memoryLogic";
import { MEMORY_NOTICE_GAP_MS } from "../app-electron/shared/memoryNotice";
import type { AgentRegistration, AgentStatus } from "../app-electron/shared/agentTypes";
import type { SavedTerminalWorkspace } from "../app-electron/shared/types";

const IDLE: AgentStatus = { state: "idle", source: "exact", lastActivity: 1 };
const RUNNING: AgentStatus = { state: "running", source: "exact", lastActivity: 1 };
const LINE = memoryPromptLine("ayse");

const reg = (over: Partial<AgentRegistration> = {}): AgentRegistration => ({
  paneId: "p1",
  ptyId: "t1",
  engine: "axet-code",
  cwd: "C:\\kok",
  command: "axet-code -y",
  name: "Ayşe",
  roleKind: "custom",
  sap: false,
  added: true,
  workspaceId: "w1",
  ...over
});

// null: bellek kapalı (undefined varsayılanı tetiklerdi).
const workspace = (memory: string | null = "ayse"): SavedTerminalWorkspace => ({
  id: "w1",
  name: "A",
  root: "C:\\kok",
  panes: [{ id: "p1", kind: "agent", cwd: "C:\\kok", title: "Ayşe", agent: { engine: "axet-code", role: "", roleKind: "custom", ...(memory ? { memory } : {}) } }]
});

function harness() {
  const clock = { ms: 1_000_000 };
  const presence: AgentPresence[] = [{ reg: reg(), status: IDLE, inputIdle: true, engineReady: true }];
  const state = { workspaces: [workspace()] };
  const settles: ((outcome: "sent" | "aborted") => void)[] = [];
  const deps = {
    now: () => clock.ms,
    agents: vi.fn(() => presence),
    workspaces: vi.fn(() => state.workspaces),
    ensureFile: vi.fn((_root: string, _key: string, _name: string): MemoryEnsure => "created"),
    sendPrompt: vi.fn((_paneId: string, _text: string, onSettled?: (outcome: "sent" | "aborted") => void): AgentPromptResult => {
      if (onSettled) settles.push(onSettled);
      return "ok";
    }),
    log: vi.fn()
  };
  const notifier = createMemoryNotifier(deps);
  const set = (over: Partial<AgentPresence>) => (presence[0] = { ...presence[0], ...over });
  return { clock, presence, state, settles, deps, notifier, set };
}

describe("bir kez, boşta bir anda (§3)", () => {
  it("motor hazır olmadan gönderilmiyor; hazır+boşta tek satır; gönderildikten sonra bir daha yok", () => {
    const { deps, notifier, set, settles, clock } = harness();
    set({ engineReady: false });
    notifier.tick();
    expect(deps.sendPrompt).not.toHaveBeenCalled();
    set({ engineReady: true });
    notifier.tick();
    expect(deps.ensureFile).toHaveBeenCalledWith("C:\\kok", "ayse", "Ayşe");
    expect(deps.sendPrompt).toHaveBeenCalledTimes(1);
    expect(deps.sendPrompt.mock.calls[0][0]).toBe("p1");
    expect(deps.sendPrompt.mock.calls[0][1]).toBe(LINE);
    expect(notifier.notice("p1")).toBe("sending");
    notifier.tick();
    expect(deps.sendPrompt).toHaveBeenCalledTimes(1);
    settles[0]("sent");
    expect(notifier.notice("p1")).toBe("sent");
    for (let i = 0; i < 100; i += 1) {
      clock.ms += 1_000;
      notifier.tick();
    }
    expect(deps.sendPrompt).toHaveBeenCalledTimes(1);
    expect(deps.log).toHaveBeenCalledWith("bellek.bildirim", { sonuc: "tamam", deneme: 1 });
  });

  it("çalışırken deneme sayılmıyor: pano işi 10 dk sürse de bellek satırı sonra gidiyor", () => {
    const { deps, notifier, set, clock } = harness();
    set({ status: RUNNING });
    for (let i = 0; i < 600; i += 1) {
      clock.ms += 1_000;
      notifier.tick();
    }
    expect(deps.sendPrompt).not.toHaveBeenCalled();
    set({ status: { state: "asking", source: "exact", lastActivity: 1 } });
    notifier.tick();
    set({ status: IDLE, inputIdle: false });
    notifier.tick();
    expect(deps.sendPrompt).not.toHaveBeenCalled();
    expect(notifier.notice("p1")).toBe("pending");
    set({ inputIdle: true });
    notifier.tick();
    expect(deps.sendPrompt).toHaveBeenCalledTimes(1);
  });

  it("reddedilen deneme 10 sn arayla; üçüncüde vazgeçiliyor ve günlüğe düşüyor", () => {
    const { deps, notifier, clock } = harness();
    deps.sendPrompt.mockReturnValue("busy");
    notifier.tick();
    expect(deps.sendPrompt).toHaveBeenCalledTimes(1);
    clock.ms += MEMORY_NOTICE_GAP_MS - 1;
    notifier.tick();
    expect(deps.sendPrompt).toHaveBeenCalledTimes(1);
    clock.ms += 1;
    notifier.tick();
    expect(deps.sendPrompt).toHaveBeenCalledTimes(2);
    clock.ms += MEMORY_NOTICE_GAP_MS;
    notifier.tick();
    expect(deps.sendPrompt).toHaveBeenCalledTimes(3);
    expect(notifier.notice("p1")).toBe("failed");
    clock.ms += 10 * MEMORY_NOTICE_GAP_MS;
    notifier.tick();
    expect(deps.sendPrompt).toHaveBeenCalledTimes(3);
    expect(deps.log).toHaveBeenCalledWith("bellek.bildirim", { sonuc: "vazgecildi", deneme: 3 });
  });

  it("aborted deneme sayılıyor; eşzamanlı aborted bir kez sayılıyor", () => {
    const { deps, notifier, settles, clock } = harness();
    notifier.tick();
    settles[0]("aborted");
    expect(notifier.notice("p1")).toBe("pending");
    deps.sendPrompt.mockImplementationOnce((_p, _t, onSettled) => {
      onSettled?.("aborted");
      return "ok";
    });
    clock.ms += MEMORY_NOTICE_GAP_MS;
    notifier.tick();
    expect(notifier.notice("p1")).toBe("pending");
    clock.ms += MEMORY_NOTICE_GAP_MS;
    notifier.tick();
    expect(notifier.notice("p1")).toBe("sending");
    settles[settles.length - 1]("aborted");
    expect(notifier.notice("p1")).toBe("failed");
  });

  it("yeniden başlatma (yeni pty): yeniden bir kez; eski sürecin geç gelen sonucu yok sayılıyor", () => {
    const { deps, notifier, set, settles } = harness();
    notifier.tick();
    set({ reg: reg({ ptyId: "t2" }) });
    notifier.tick();
    expect(deps.sendPrompt).toHaveBeenCalledTimes(2);
    settles[0]("aborted");
    expect(notifier.notice("p1")).toBe("sending");
    settles[1]("sent");
    expect(notifier.notice("p1")).toBe("sent");
  });

  it("kapanan bölmenin kaydı atılıyor", () => {
    const { notifier, presence } = harness();
    notifier.tick();
    presence.splice(0);
    notifier.tick();
    expect(notifier.notice("p1")).toBe("none");
  });
});

describe("bellek kapalı, etkinleştirme, dosya (§3, §7; sapma 3, 8)", () => {
  it("bellek kapalı ajana hiçbir şey gitmiyor; config en çok 10 sn'de bir okunuyor; etkinleşince gidiyor", () => {
    const { deps, notifier, state, clock } = harness();
    state.workspaces = [workspace(null)];
    for (let i = 0; i < 20; i += 1) {
      notifier.tick();
      clock.ms += 1_000;
    }
    expect(deps.sendPrompt).not.toHaveBeenCalled();
    expect(deps.ensureFile).not.toHaveBeenCalled();
    expect(deps.workspaces.mock.calls.length).toBeLessThanOrEqual(3);
    state.workspaces = [workspace("ayse")];
    for (let i = 0; i < 10; i += 1) {
      notifier.tick();
      clock.ms += 1_000;
    }
    expect(deps.sendPrompt).toHaveBeenCalledTimes(1);
  });

  it("alanı olmayan kayıt (eski renderer) bildirim almıyor", () => {
    const { deps, notifier, set } = harness();
    set({ reg: reg({ workspaceId: undefined }) });
    notifier.tick();
    expect(deps.sendPrompt).not.toHaveBeenCalled();
  });

  it("dosya yaratılamazsa gönderilmiyor; durum failed, günlükte 'dosya'; Yeniden bildir yeniden deniyor", () => {
    const { deps, notifier } = harness();
    deps.ensureFile.mockReturnValueOnce("failed");
    notifier.tick();
    expect(deps.sendPrompt).not.toHaveBeenCalled();
    expect(notifier.notice("p1")).toBe("failed");
    expect(deps.log).toHaveBeenCalledWith("bellek.bildirim", { sonuc: "dosya", deneme: 0 });
    expect(notifier.renotify("p1")).toBe(true);
    notifier.tick();
    expect(deps.sendPrompt).toHaveBeenCalledTimes(1);
  });

  it("gönderilirken Yeniden bildir reddediliyor; bilinmeyen bölme false", () => {
    const { notifier } = harness();
    notifier.tick();
    expect(notifier.renotify("p1")).toBe(false);
    expect(notifier.renotify("yok")).toBe(false);
  });

  it("bağımlılık fırlatsa da tick fırlatmıyor", () => {
    const { deps, notifier, clock } = harness();
    deps.agents.mockImplementationOnce(() => {
      throw new Error("x");
    });
    expect(() => notifier.tick()).not.toThrow();
    clock.ms += MEMORY_NOTICE_GAP_MS;
    deps.workspaces.mockImplementationOnce(() => {
      throw new Error("x");
    });
    expect(() => notifier.tick()).not.toThrow();
    clock.ms += MEMORY_NOTICE_GAP_MS;
    deps.ensureFile.mockImplementationOnce(() => {
      throw new Error("x");
    });
    expect(() => notifier.tick()).not.toThrow();
    expect(deps.ensureFile).toHaveBeenCalledTimes(1);
    expect(deps.sendPrompt).not.toHaveBeenCalled();
    // Dosya yaratılamadı sayılıyor (vazgeçildi); sendPrompt yolu için baştan.
    expect(notifier.notice("p1")).toBe("failed");
    expect(notifier.renotify("p1")).toBe(true);
    clock.ms += MEMORY_NOTICE_GAP_MS;
    deps.sendPrompt.mockImplementationOnce(() => {
      throw new Error("x");
    });
    expect(() => notifier.tick()).not.toThrow();
    expect(deps.sendPrompt).toHaveBeenCalledTimes(1);
    // Gönderiliyor durumunda takılı kalmadı: düşen deneme sayıldı, yeniden bekliyor.
    expect(notifier.notice("p1")).toBe("pending");
  });

  it("günlükte yol, anahtar ya da metin yok", () => {
    const { deps, notifier, settles } = harness();
    notifier.tick();
    settles[0]("sent");
    const logged = JSON.stringify(deps.log.mock.calls);
    expect(logged).not.toMatch(/ayse|bellek\/|kok|Kalici/);
  });
});

// --- gerçek izleyiciyle Görev Panosu sırası ---------------------------------

class FakeReader implements AgentReader {
  current: AgentStatus = IDLE;
  feedOutput() {}
  submitLine() {}
  poll() {}
  status() {
    return this.current;
  }
  engineReady() {
    return true;
  }
  dispose() {}
}

describe("Görev Panosu ile sıra (§3)", () => {
  it("aynı turda ikisi de bekliyorsa bellek satırı önce gider; pano 'busy' alıp sonraki tura kalır", () => {
    const clock = { ms: 1_000_000 };
    const writes: string[] = [];
    const jobs: (() => void)[] = [];
    const monitor = createAgentMonitor({
      now: () => clock.ms,
      createReader: () => new FakeReader(),
      emit: () => {},
      notify: () => {},
      write: (_ptyId, data) => {
        writes.push(data);
        return true;
      },
      backlog: () => "",
      log: () => {},
      schedule: (fn) => {
        jobs.push(fn);
      }
    });
    monitor.register(reg());
    const notifier = createMemoryNotifier({
      now: () => clock.ms,
      agents: () => monitor.agents(),
      workspaces: () => [workspace()],
      ensureFile: () => "exists",
      sendPrompt: (paneId, text, onSettled) => monitor.sendPrompt(paneId, text, onSettled),
      log: () => {}
    });
    // index.ts'teki tur: önce bellek, sonra pano.
    notifier.tick();
    expect(monitor.sendPrompt("p1", "[Gorev abcd1234] is", () => {})).toBe("busy");
    jobs.splice(0).forEach((job) => job());
    expect(writes).toEqual([LINE, "\r"]);
    expect(notifier.notice("p1")).toBe("sent");
  });
});
