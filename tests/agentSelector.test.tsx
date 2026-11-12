// @vitest-environment jsdom
// Sohbet ajanı seçicisi (axet151 madde 1): varsayılan seçenek etkin ajanın
// adını açıkça gösteriyor; kısıtlı varsayılan için ipucu; seçim null|ad.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import AgentSelector from "../src/components/AgentSelector";
import { effectiveAgent, isRestrictedAgent, selectableAgents } from "../src/lib/axetAgents";

afterEach(cleanup);

const AGENTS = [
  { name: "coder", scope: "builtin", permissions: "ask (default)", description: "An agent that helps with executing coding tasks." },
  { name: "security", scope: "builtin", permissions: "ask (default)", description: "Reviews the security of the code" },
  { name: "code-analyzer", scope: "user", permissions: "*=ask bash=deny edit=deny write=deny", description: "Read-only" }
];

function renderSel(current: string | null, defaultAgent: string | null, lang: "tr" | "en" = "tr") {
  const onSelect = vi.fn();
  const onOpen = vi.fn();
  render(
    <LanguageProvider language={lang}>
      <AgentSelector agents={AGENTS} current={current} defaultAgent={defaultAgent} onSelect={onSelect} onOpen={onOpen} />
    </LanguageProvider>
  );
  return { onSelect, onOpen };
}

describe("isRestrictedAgent / effectiveAgent", () => {
  it("güvenlik/yetki adı ya da deny izni kısıtlı; coder değil", () => {
    expect(isRestrictedAgent("security")).toBe(true);
    expect(isRestrictedAgent("auth-plus")).toBe(true);
    expect(isRestrictedAgent("code-analyzer", AGENTS[2])).toBe(true);
    expect(isRestrictedAgent("coder", AGENTS[0])).toBe(false);
    expect(isRestrictedAgent(null)).toBe(false);
  });
  it("seçim varsa o, yoksa varsayılan", () => {
    expect(effectiveAgent("coder", "security")).toBe("coder");
    expect(effectiveAgent(null, "security")).toBe("security");
    expect(effectiveAgent(undefined, null)).toBeNull();
  });
});

describe("selectableAgents", () => {
  it("ana ajan olamayan guide/task listede yok (1.5.1 ölçümü)", () => {
    const names = selectableAgents([{ name: "coder" }, { name: "guide" }, { name: "task" }, { name: "security" }]).map((a) => a.name);
    expect(names).toEqual(["coder", "security"]);
  });
});

describe("AgentSelector", () => {
  it("seçim yoksa etiket 'axet varsayılanı (security)' ve kısıtlı ipucu", () => {
    const { onOpen } = renderSel(null, "security");
    const btn = screen.getByTestId("agent-selector");
    expect(btn.textContent).toContain("axet varsayılanı (security)");
    expect(btn.getAttribute("title")).toContain("genel amaçlı değil");
    fireEvent.click(btn);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText(/genel amaçlı değil/).length).toBeGreaterThan(0);
  });
  it("ingilizce etiket", () => {
    renderSel(null, "security", "en");
    expect(screen.getByTestId("agent-selector").textContent).toContain("axet default (security)");
  });
  it("varsayılan okunamadıysa adsız etiket, ipucu yok", () => {
    renderSel(null, null);
    const btn = screen.getByTestId("agent-selector");
    expect(btn.textContent).toContain("axet varsayılanı");
    expect(btn.getAttribute("title")).toBe("Ajan");
  });
  it("kullanıcı seçtiyse ad gösteriliyor, ipucu yok; seçim ve varsayılana dönüş", () => {
    const { onSelect } = renderSel("coder", "security");
    const btn = screen.getByTestId("agent-selector");
    expect(btn.textContent).toContain("coder");
    expect(btn.getAttribute("title")).toBe("Ajan");
    fireEvent.click(btn);
    fireEvent.click(screen.getByText("code-analyzer"));
    expect(onSelect).toHaveBeenLastCalledWith("code-analyzer");
    fireEvent.click(screen.getByTestId("agent-selector"));
    fireEvent.click(screen.getByText("axet varsayılanı (security)"));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });
});
