// Tur 8: axet-code açılış penceresinin (araç + model) otomatik seçimi.
// Tuş dizileri ve metinler ölçümden (.superpowers/olcum/arac-secim/OLCUM.md).
import { describe, expect, it } from "vitest";
import {
  AUTO_SETUP_MAX_ATTEMPTS,
  AUTO_SETUP_RETRY_MS,
  AUTO_SETUP_SEND_DELAY_MS,
  AxetSetupPilot,
  changedModel,
  detectAxetDialog,
  isTerminalReport,
  normalizeAutoModel,
  normalizeAutoTool,
  setupKeySteps,
  type AutoSetupOutcome
} from "../app-electron/main/axetAutoSetup";

// Ölçülen ekranların (ANSI süzülmüş) özü.
const TOOL =
  "│ Select Tool ╱╱╱ │\n│ Choose your development tool │\n│ aXet.Code│\n│ Interactive AI chat in terminal│\n│ Codex (OpenAI)│\n│ ↑/↓ choose • enter confirm│";
const MODEL =
  "│ Switch Model ◉ Large Task ○ Small Task ││ To start, let's choose a provider and model. ││ > Find your fave││ Recently used ── ││ Claude Sonnet 5 aws_anthropic ││ ↑/↓ choose • enter confirm│";
const CHAT = "> Yolo mode!\n large model changed to Claude Sonnet 5 ctrl+p commands • ctrl+l models • ctrl+j newline";

describe("detectAxetDialog", () => {
  it("araç penceresi: işaret + altbilgi", () => {
    expect(detectAxetDialog(TOOL)).toBe("tool");
  });
  it("model penceresi", () => {
    expect(detectAxetDialog(MODEL)).toBe("model");
  });
  it("altbilgi çizilmeden pencere hazır sayılmıyor", () => {
    expect(detectAxetDialog("│ Choose your development tool │\n│ aXet.Code│")).toBeNull();
    expect(detectAxetDialog("To start, let's choose a provider and model.")).toBeNull();
  });
  it("altbilgi işaretten ÖNCE ise (önceki pencerenin) sayılmıyor", () => {
    expect(detectAxetDialog("↑/↓ choose • enter confirm │ Choose your development tool")).toBeNull();
  });
  it("en son görünen kazanır: araç → model → sohbet", () => {
    expect(detectAxetDialog(TOOL + MODEL)).toBe("model");
    expect(detectAxetDialog(TOOL + MODEL + CHAT)).toBe("chat");
    expect(detectAxetDialog(CHAT + TOOL)).toBe("tool");
  });
  it("hiçbiri yoksa null", () => {
    expect(detectAxetDialog("C:\\p>axet-code -y")).toBeNull();
  });
});

describe("setupKeySteps (ölçülen tuş dizisi)", () => {
  it("araç: aXet.Code vurgulu → yalnız Enter", () => {
    expect(setupKeySteps("tool", { tool: "axet", model: "" }).map((s) => s.data)).toEqual(["\r"]);
  });
  it("araç: Codex → ↓, 150 ms, Enter", () => {
    const steps = setupKeySteps("tool", { tool: "codex", model: "" });
    expect(steps.map((s) => s.data)).toEqual(["\x1b[B", "\r"]);
    expect(steps[1].delayMs).toBe(150);
  });
  it("model: boşsa vurgulu ilk son kullanılan → Enter", () => {
    expect(setupKeySteps("model", { tool: "axet", model: "" }).map((s) => s.data)).toEqual(["\r"]);
  });
  it("model: doluysa süzgece yaz, 400 ms, Enter", () => {
    const steps = setupKeySteps("model", { tool: "axet", model: "sonnet 5" });
    expect(steps.map((s) => s.data)).toEqual(["sonnet 5", "\r"]);
    expect(steps[1].delayMs).toBe(400);
  });
});

describe("ayar süzgeçleri", () => {
  it("model: yalnız güvenli karakterler, ≤ 60", () => {
    expect(normalizeAutoModel("  Claude Sonnet 4.6 ")).toBe("Claude Sonnet 4.6");
    expect(normalizeAutoModel("gpt-5.1/openai")).toBe("gpt-5.1/openai");
    expect(normalizeAutoModel("a\rb")).toBe("");
    expect(normalizeAutoModel("x\x1b[B")).toBe("");
    expect(normalizeAutoModel("a & b")).toBe("");
    expect(normalizeAutoModel(42)).toBe("");
    expect(normalizeAutoModel("x".repeat(61))).toBe("");
  });
  it("araç: bilinmeyen → aXet.Code", () => {
    expect(normalizeAutoTool("codex")).toBe("codex");
    expect(normalizeAutoTool("vim")).toBe("axet");
    expect(normalizeAutoTool(undefined)).toBe("axet");
  });
});

describe("changedModel", () => {
  it("axet-code'un kendi satırından model adı", () => {
    expect(changedModel(CHAT)).toBe("Claude Sonnet 5");
    expect(changedModel("large model changed to GPT-6 Luna\n")).toBe("GPT-6 Luna");
    expect(changedModel("başka")).toBeNull();
  });
});

describe("isTerminalReport", () => {
  it("terminalin kendi cevapları kullanıcı yazısı değil", () => {
    expect(isTerminalReport("\x1b[?1;2c")).toBe(true);
    expect(isTerminalReport("\x1b[12;40R")).toBe(true);
    expect(isTerminalReport("\x1b[I")).toBe(true);
    expect(isTerminalReport("\x1b[O")).toBe(true);
    expect(isTerminalReport("\x1b]11;rgb:0000/0000/0000\x1b\\")).toBe(true);
    expect(isTerminalReport("\x1b[<0;10;5M")).toBe(true);
  });
  it("tuşlar ve metin kullanıcı yazısı", () => {
    expect(isTerminalReport("a")).toBe(false);
    expect(isTerminalReport("\r")).toBe(false);
    expect(isTerminalReport("\x1b[B")).toBe(false);
    expect(isTerminalReport("\x1b")).toBe(false);
    expect(isTerminalReport("")).toBe(false);
  });
});

function pilotHarness(prefs = { tool: "axet" as const, model: "" }) {
  const clock = { ms: 1_000_000 };
  const writes: string[] = [];
  const timers: { at: number; fn: () => void }[] = [];
  const outcomes: AutoSetupOutcome[] = [];
  const input = { at: 0, draft: false };
  const writeOk = { value: true };
  const pilot = new AxetSetupPilot(prefs, {
    now: () => clock.ms,
    write: (d) => {
      writes.push(d);
      return writeOk.value;
    },
    schedule: (fn, ms) => timers.push({ at: clock.ms + ms, fn }),
    lastUserInputAt: () => input.at,
    hasDraft: () => input.draft,
    onSettled: (o) => outcomes.push(o)
  });
  const advance = (ms: number) => {
    const end = clock.ms + ms;
    for (;;) {
      timers.sort((a, b) => a.at - b.at);
      const next = timers[0];
      if (!next || next.at > end) break;
      timers.shift();
      clock.ms = next.at;
      next.fn();
    }
    clock.ms = end;
  };
  return { clock, writes, outcomes, input, writeOk, pilot, advance };
}

describe("AxetSetupPilot", () => {
  it("araç → model → sohbet: iki Enter, bir kez 'otomatik seçildi'", () => {
    const h = pilotHarness();
    h.pilot.feed(TOOL);
    expect(h.writes).toEqual([]);
    h.advance(AUTO_SETUP_SEND_DELAY_MS);
    expect(h.writes).toEqual(["\r"]);
    h.pilot.feed(MODEL);
    h.advance(AUTO_SETUP_SEND_DELAY_MS);
    expect(h.writes).toEqual(["\r", "\r"]);
    h.pilot.feed(CHAT);
    expect(h.outcomes).toEqual([{ ok: true, tool: "aXet.Code", model: "Claude Sonnet 5" }]);
    expect(h.pilot.finished).toBe(true);
    h.pilot.feed(TOOL);
    h.advance(AUTO_SETUP_RETRY_MS * 3);
    h.pilot.tick();
    expect(h.writes).toHaveLength(2);
    expect(h.outcomes).toHaveLength(1);
  });

  it("pencere parça sınırında bölünse de tanınıyor", () => {
    const h = pilotHarness();
    const cut = TOOL.indexOf("development") + 4;
    h.pilot.feed(TOOL.slice(0, cut));
    h.advance(AUTO_SETUP_SEND_DELAY_MS);
    expect(h.writes).toEqual([]);
    h.pilot.feed(TOOL.slice(cut));
    h.advance(AUTO_SETUP_SEND_DELAY_MS);
    expect(h.writes).toEqual(["\r"]);
  });

  it("model ayarı süzgece yazılıyor, Codex için ↓", () => {
    const h = pilotHarness({ tool: "codex", model: "sonnet 5" } as never);
    h.pilot.feed(TOOL);
    h.advance(AUTO_SETUP_SEND_DELAY_MS + 150);
    expect(h.writes).toEqual(["\x1b[B", "\r"]);
    h.pilot.feed(MODEL);
    h.advance(AUTO_SETUP_SEND_DELAY_MS + 400);
    expect(h.writes).toEqual(["\x1b[B", "\r", "sonnet 5", "\r"]);
  });

  it("pencere yoksa (doğrudan sohbet) hiçbir şey yazmıyor ve kart yok", () => {
    const h = pilotHarness();
    h.pilot.feed(CHAT);
    h.advance(AUTO_SETUP_RETRY_MS * 3);
    h.pilot.tick();
    expect(h.writes).toEqual([]);
    expect(h.outcomes).toEqual([]);
    expect(h.pilot.finished).toBe(true);
  });

  it("kullanıcı o an yazıyorsa göndermiyor; durunca gönderiyor", () => {
    const h = pilotHarness();
    h.input.at = h.clock.ms - 500;
    h.pilot.feed(TOOL);
    h.advance(AUTO_SETUP_SEND_DELAY_MS);
    h.pilot.tick();
    expect(h.writes).toEqual([]);
    h.advance(2_000);
    h.pilot.tick();
    h.advance(AUTO_SETUP_SEND_DELAY_MS);
    expect(h.writes).toEqual(["\r"]);
  });

  it("taslak varken göndermiyor", () => {
    const h = pilotHarness();
    h.input.draft = true;
    h.pilot.feed(TOOL);
    h.advance(AUTO_SETUP_SEND_DELAY_MS);
    h.pilot.tick();
    expect(h.writes).toEqual([]);
  });

  it("kullanıcı pencere açıldıktan sonra dokunduysa çekiliyor (kart yok)", () => {
    const h = pilotHarness();
    h.pilot.feed(TOOL);
    h.advance(100);
    h.input.at = h.clock.ms;
    h.advance(AUTO_SETUP_SEND_DELAY_MS);
    h.advance(AUTO_SETUP_RETRY_MS * 3);
    h.pilot.tick();
    expect(h.writes).toEqual([]);
    expect(h.outcomes).toEqual([]);
    expect(h.pilot.finished).toBe(true);
  });

  it("aynı pencere için en çok 2 deneme, sonra bir kez başarısız", () => {
    const h = pilotHarness();
    h.pilot.feed(TOOL);
    h.advance(AUTO_SETUP_SEND_DELAY_MS);
    expect(h.writes).toEqual(["\r"]);
    h.advance(AUTO_SETUP_RETRY_MS);
    h.pilot.tick();
    h.advance(AUTO_SETUP_SEND_DELAY_MS);
    expect(h.writes).toEqual(["\r", "\r"]);
    h.advance(AUTO_SETUP_RETRY_MS);
    h.pilot.tick();
    h.advance(AUTO_SETUP_RETRY_MS);
    h.pilot.tick();
    expect(h.writes).toHaveLength(AUTO_SETUP_MAX_ATTEMPTS);
    expect(h.outcomes).toEqual([{ ok: false, dialog: "tool" }]);
    expect(h.pilot.finished).toBe(true);
  });

  it("yazma başarısızsa deneme sayılıyor", () => {
    const h = pilotHarness();
    h.writeOk.value = false;
    h.pilot.feed(TOOL);
    h.advance(AUTO_SETUP_SEND_DELAY_MS);
    h.advance(AUTO_SETUP_RETRY_MS);
    h.pilot.tick();
    h.advance(AUTO_SETUP_SEND_DELAY_MS + AUTO_SETUP_RETRY_MS);
    h.pilot.tick();
    expect(h.outcomes).toEqual([{ ok: false, dialog: "tool" }]);
  });

  it("çok adımlı dizide kullanıcı araya girerse kalan tuş gitmiyor", () => {
    const h = pilotHarness({ tool: "axet", model: "sonnet 5" } as never);
    h.pilot.feed(MODEL);
    h.advance(AUTO_SETUP_SEND_DELAY_MS);
    expect(h.writes).toEqual(["sonnet 5"]);
    h.input.at = h.clock.ms + 10;
    h.advance(400);
    expect(h.writes).toEqual(["sonnet 5"]);
    h.advance(AUTO_SETUP_RETRY_MS * 3);
    h.pilot.tick();
    expect(h.outcomes).toEqual([]);
  });

  it("model adı görünmezse ayardaki süzgeç, o da yoksa boş", () => {
    const h = pilotHarness();
    h.pilot.feed(TOOL);
    h.advance(AUTO_SETUP_SEND_DELAY_MS);
    h.pilot.feed("ctrl+j newline");
    expect(h.outcomes).toEqual([{ ok: true, tool: "aXet.Code", model: "" }]);
  });
});
