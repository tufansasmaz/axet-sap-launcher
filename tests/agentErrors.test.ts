import { describe, expect, it } from "vitest";
import {
  AXET_CONTINUE_PROMPT,
  classifyAgentError,
  cleanErrorDetail,
  decideRetry,
  flowErrorDetail,
  isTransientError,
  normalizeConcurrency,
  normalizeRetryMax,
  normalizeStallMinutes,
  parseFlowErrorDetail,
  retryDelayMs,
  retryPromptFor,
  scanTerminalError
} from "../app-electron/shared/agentErrors";

// Gerçek örnekler: .superpowers/olcum/hata/ (axet-code oturum kayıtları, adres ve jeton maskeli).
const REAL = {
  rate: 'Too Many Requests POST "<url>": 429 Too Many Requests {"message":"Too many tokens, please wait before trying again."}',
  rate2: 'Too Many Requests POST "<url>": 429 Too Many Requests {"message":"Too many requests, please wait before trying again. You have sent"}',
  server: 'Internal Server Error POST "<url>": 500 Internal Server Error ',
  eof: "Provider Error unexpected EOF",
  eof4: "Provider Error provider error after 4 attempts: unexpected EOF",
  deadline: "Provider Error failed to write file: context deadline exceeded",
  forbidden: 'Forbidden POST "<url>": 403 Forbidden ',
  history: 'Bad Request POST "<url>": 400 Bad Request {"message":"messages.58: `tool_use` ids were found without `tool_result` blocks immediately after: ***"}',
  history2: 'Bad Request POST "<url>": 400 Bad Request {"message":"messages.194.content.1: unexpected `tool_use_id` found in `tool_result` blocks"}',
  tooLong: 'Bad Request POST "<url>": 400 Bad Request {"message":"prompt is too long: 1000376 tokens > 1000000 maximum"}',
  model: 'Failed to override models: large model "aws_anthropic/olmayan-model-x" not found.',
  policy: '403 Forbidden {"error":"request_blocked","message":"This request is not allowed under the current security policy."}',
  image: 'Bad Request POST "<url>": 400 Bad Request {"message":"messages.8.content.3.image.source.base64.data: At least one of the image dimensions exceed max"}'
};

describe("classifyAgentError (gerçek örnekler)", () => {
  it.each([
    [REAL.rate, "rateLimit"],
    [REAL.rate2, "rateLimit"],
    [REAL.server, "unavailable"],
    [REAL.eof, "network"],
    [REAL.eof4, "network"],
    [REAL.deadline, "network"],
    [REAL.forbidden, "auth"],
    [REAL.history, "history"],
    [REAL.history2, "history"],
    [REAL.tooLong, "context"],
    [REAL.model, "model"],
    [REAL.policy, "policy"],
    [REAL.image, "unknown"],
    ["API Error: 529 {\"type\":\"error\",\"error\":{\"type\":\"overloaded_error\"}}", "unavailable"],
    ["API Error (Request timed out.)", "network"],
    ["Invalid API key · Please run /login", "auth"],
    ["[API Error: got status: 429 RESOURCE_EXHAUSTED]", "rateLimit"],
    ["took 503 ms at line 429x", "unknown"]
  ])("%s → %s", (text, cls) => {
    expect(classifyAgentError(text)).toBe(cls);
  });

  it("yalnız servis/istek sınırı/ağ geçici", () => {
    expect(["unavailable", "rateLimit", "network"].every((c) => isTransientError(c as never))).toBe(true);
    expect(["auth", "model", "context", "history", "policy", "unknown"].some((c) => isTransientError(c as never))).toBe(false);
  });
});

describe("cleanErrorDetail", () => {
  it("adres ve uzun jetonu maskeler, kırpar", () => {
    const out = cleanErrorDetail(`POST "https://axet.nttdata.com/x/y?z=1": 403 Forbidden ${"a".repeat(40)} ${"x ".repeat(200)}`);
    expect(out).toContain("<url>");
    expect(out).not.toContain("axet.nttdata.com");
    expect(out).toContain("***");
    expect(out.length).toBeLessThanOrEqual(200);
  });
});

describe("scanTerminalError", () => {
  it("axet-code başlık satırından sonraki ileti", () => {
    const out = "  INFO x\n\n   ERROR  \n\n  Failed to override models: large model \"m\" not found.\n\nC:\\tmp>";
    expect(scanTerminalError(out)).toContain("Failed to override models");
  });
  it("Claude Code API hatası", () => {
    expect(scanTerminalError("> merhaba\n  ⎿  API Error: 500 {\"type\":\"error\"}\n")).toContain("API Error: 500");
  });
  it("tur sonunda cevaptaki sıradan 'Error:' satırı hata sayılmaz; yalnız son satırlar", () => {
    expect(scanTerminalError("Test çıktısı:\nError: expected 1 to be 2\nDüzelttim.", "turn")).toBeNull();
    expect(scanTerminalError("⎿  API Error: 500 {}", "turn")).toContain("API Error");
    expect(scanTerminalError(`API Error: 500\n${"satır\n".repeat(12)}`, "turn")).toBeNull();
  });
  it("hata satırı yoksa null", () => {
    expect(scanTerminalError("Merhaba, nasıl yardımcı olabilirim?\n> ")).toBeNull();
  });
});

describe("yeniden deneme kuralları", () => {
  it("üstel bekleme 10/30/90 sn, sapma ±%20", () => {
    expect(retryDelayMs(1, () => 0.5)).toBe(10_000);
    expect(retryDelayMs(2, () => 0.5)).toBe(30_000);
    expect(retryDelayMs(3, () => 0.5)).toBe(90_000);
    expect(retryDelayMs(1, () => 0)).toBe(8_000);
    expect(retryDelayMs(1, () => 1)).toBe(12_000);
    expect(retryDelayMs(9, () => 0.5)).toBe(300_000);
  });
  it("geçici hatada deneme, sınırda durur", () => {
    expect(decideRetry({ cls: "rateLimit", attempts: 0, auto: true, max: 3, alive: true })).toEqual({ auto: true, attempt: 1 });
    expect(decideRetry({ cls: "unavailable", attempts: 2, auto: true, max: 3, alive: true })).toEqual({ auto: true, attempt: 3 });
    expect(decideRetry({ cls: "network", attempts: 3, auto: true, max: 3, alive: true })).toEqual({ auto: false, reason: "exhausted" });
  });
  it("kalıcı hatada, ayar kapalıyken ve motor kapanmışken otomatik deneme yok", () => {
    expect(decideRetry({ cls: "auth", attempts: 0, auto: true, max: 3, alive: true })).toEqual({ auto: false, reason: "permanent" });
    expect(decideRetry({ cls: "model", attempts: 0, auto: true, max: 3, alive: true })).toEqual({ auto: false, reason: "permanent" });
    expect(decideRetry({ cls: "rateLimit", attempts: 0, auto: false, max: 3, alive: true })).toEqual({ auto: false, reason: "off" });
    expect(decideRetry({ cls: "rateLimit", attempts: 0, auto: true, max: 3, alive: false })).toEqual({ auto: false, reason: "exited" });
  });
  it("axet-code devam ettirir, öbürleri son istemi yineler", () => {
    expect(retryPromptFor("axet-code", "x")).toBe(AXET_CONTINUE_PROMPT);
    expect(retryPromptFor("claude", " rapor yaz ")).toBe("rapor yaz");
    expect(retryPromptFor("codex", "")).toBeNull();
    expect(AXET_CONTINUE_PROMPT).toMatch(/^[\x20-\x7e]+$/);
  });
  it("ayar sınırları", () => {
    expect(normalizeRetryMax(5)).toBe(5);
    expect(normalizeRetryMax(9)).toBe(3);
    expect(normalizeConcurrency(0)).toBe(0);
    expect(normalizeConcurrency("x")).toBe(2);
    expect(normalizeStallMinutes(20)).toBe(20);
    expect(normalizeStallMinutes(7)).toBe(10);
  });
});

describe("Akış hata ayrıntısı", () => {
  it("gidiş-dönüş", () => {
    const d = flowErrorDetail({ cls: "rateLimit", attempts: 3, max: 3, detail: "429 | Too Many" });
    expect(parseFlowErrorDetail(d)).toEqual({ cls: "rateLimit", attempts: 3, max: 3, detail: "429 / Too Many" });
    expect(parseFlowErrorDetail(flowErrorDetail({ cls: "auth", detail: "403" }))).toEqual({ cls: "auth", attempts: 0, max: 0, detail: "403" });
    expect(parseFlowErrorDetail("")).toBeNull();
  });
});
