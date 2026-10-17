// @vitest-environment jsdom
// Ajan ekleme penceresi (spec 2026-10-17 ajan-alani §4, §5, §14.2).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import AddAgentDialog from "../src/agents/AddAgentDialog";
import type { AgentEngineInfo } from "../app-electron/shared/agentTypes";

const ENGINES: AgentEngineInfo[] = [
  { id: "axet-code", installed: true, blocked: false },
  { id: "claude", installed: true, blocked: false },
  { id: "codex", installed: false, blocked: true },
  { id: "gemini", installed: false, blocked: true },
  { id: "ozel", installed: true, blocked: false }
];

let prevApi: unknown;
let api: Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  prevApi = (window as unknown as { api?: unknown }).api;
  api = {
    pickFolder: vi.fn(),
    axetAgents: vi.fn(async () => [
      { name: "coder", scope: "builtin", permissions: "ask (default)", description: "Kod" },
      { name: "task", scope: "builtin", permissions: "ask (default)", description: "Arama" }
    ])
  };
  (window as unknown as { api: unknown }).api = api;
});

afterEach(() => {
  cleanup();
  (window as unknown as { api: unknown }).api = prevApi;
});

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

function renderDialog(engines: AgentEngineInfo[] | null = ENGINES) {
  const onAdd = vi.fn();
  const onCancel = vi.fn();
  render(
    <LanguageProvider language="tr">
      <AddAgentDialog open defaultCwd={"C:\\p"} defaultName="Ajan 2" engines={engines} onAdd={onAdd} onCancel={onCancel} />
    </LanguageProvider>
  );
  return { onAdd, onCancel };
}

const engineGroup = () => screen.getByRole("radiogroup", { name: "Motor" });
const addButton = () => screen.getByRole("button", { name: "Ekle" }) as HTMLButtonElement;

describe("AddAgentDialog", () => {
  it("varsayılanlar: ad dolu, kurulu ilk motor seçili; Ekle rolsüz axet-code ajanı gönderiyor", async () => {
    const { onAdd } = renderDialog();
    await flush();
    expect((screen.getByLabelText("Ad") as HTMLInputElement).value).toBe("Ajan 2");
    expect(within(engineGroup()).getByRole("radio", { name: "axet-code" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(addButton());
    expect(onAdd).toHaveBeenCalledWith({
      spec: { engine: "axet-code", role: "", roleKind: "custom" },
      name: "Ajan 2",
      color: "gray",
      cwd: "C:\\p"
    });
  });

  it("axet-code ajan listesi klasörde okunuyor; seçilen ajan --agent rolü oluyor", async () => {
    const { onAdd } = renderDialog();
    await flush();
    expect(api.axetAgents).toHaveBeenCalledWith("C:\\p");
    fireEvent.change(screen.getByRole("combobox", { name: "Rol" }), { target: { value: "coder" } });
    fireEvent.click(addButton());
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ spec: { engine: "axet-code", role: "coder", roleKind: "axetAgent" } }));
  });

  it("Claude Code: hazır rol ve model; axet ajan listesi yok", async () => {
    const { onAdd } = renderDialog();
    await flush();
    fireEvent.click(within(engineGroup()).getByRole("radio", { name: "Claude Code" }));
    expect(screen.queryByRole("combobox", { name: "Rol" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Test" }));
    fireEvent.change(screen.getByLabelText("Model"), { target: { value: "sonnet" } });
    fireEvent.click(addButton());
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ spec: { engine: "claude", role: "Test", roleKind: "preset", model: "sonnet" } })
    );
  });

  it("serbest rol 'custom' olarak gidiyor", async () => {
    const { onAdd } = renderDialog();
    await flush();
    fireEvent.click(within(engineGroup()).getByRole("radio", { name: "Claude Code" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Rol" }), { target: { value: "data-migration" } });
    fireEvent.click(addButton());
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ spec: { engine: "claude", role: "data-migration", roleKind: "custom" } }));
  });

  it("özel komut: komut yazılmadan Ekle kapalı; model alanı yok", async () => {
    const { onAdd } = renderDialog();
    await flush();
    fireEvent.click(within(engineGroup()).getByRole("radio", { name: "Özel komut" }));
    expect(screen.queryByLabelText("Model")).toBeNull();
    expect(addButton().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Komut"), { target: { value: "opencode" } });
    expect(addButton().disabled).toBe(false);
    fireEvent.click(addButton());
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ spec: { engine: "ozel", role: "", roleKind: "custom", command: "opencode" } })
    );
  });

  it("kurulu olmayan motor sonda ve işaretli; seçilince uyarı görünüyor", async () => {
    renderDialog();
    await flush();
    expect(within(engineGroup()).getAllByRole("radio").map((r) => r.textContent)).toEqual([
      "axet-code",
      "Claude Code",
      "Özel komut",
      "Codex · kurulu değil",
      "Gemini CLI · kurulu değil"
    ]);
    fireEvent.click(within(engineGroup()).getByRole("radio", { name: "Codex · kurulu değil" }));
    expect(screen.getByText("Bu motor PATH'te bulunamadı; eklenebilir ama kurulana kadar başlamaz.")).toBeTruthy();
  });

  it("ad boşsa Ekle kapalı; renk ve klasör seçimi gidiyor", async () => {
    const { onAdd } = renderDialog();
    await flush();
    fireEvent.change(screen.getByLabelText("Ad"), { target: { value: "   " } });
    expect(addButton().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Ad"), { target: { value: "Ayşe" } });
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Renk" })).getByRole("radio", { name: "Mavi" }));
    api.pickFolder.mockResolvedValueOnce("C:\\diger");
    fireEvent.click(screen.getByRole("button", { name: "Değiştir" }));
    await flush();
    fireEvent.click(addButton());
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: "Ayşe", color: "blue", cwd: "C:\\diger" }));
  });

  it("motor bilgisi yokken axet-code önde", async () => {
    renderDialog(null);
    await flush();
    expect(within(engineGroup()).getAllByRole("radio")[0].textContent).toBe("axet-code");
  });

  it("geçersiz model Ekle'yi kapatıyor ve hata gösteriyor", async () => {
    const { onAdd } = renderDialog();
    await flush();
    fireEvent.click(within(engineGroup()).getByRole("radio", { name: "Claude Code" }));
    fireEvent.change(screen.getByLabelText("Model"), { target: { value: "my model" } });
    expect(addButton().disabled).toBe(true);
    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.click(addButton());
    expect(onAdd).not.toHaveBeenCalled();
    // Düzelince hata gidiyor
    fireEvent.change(screen.getByLabelText("Model"), { target: { value: "sonnet" } });
    expect(addButton().disabled).toBe(false);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("geçersiz rol Ekle'yi kapatıyor ve hata gösteriyor", async () => {
    const { onAdd } = renderDialog();
    await flush();
    fireEvent.click(within(engineGroup()).getByRole("radio", { name: "Claude Code" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Rol" }), { target: { value: "veri göçü" } });
    expect(addButton().disabled).toBe(true);
    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.click(addButton());
    expect(onAdd).not.toHaveBeenCalled();
    // Düzelince hata gidiyor
    fireEvent.change(screen.getByRole("textbox", { name: "Rol" }), { target: { value: "migration" } });
    expect(addButton().disabled).toBe(false);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("ad alanı ilk odağı alıyor (autoFocus)", async () => {
    renderDialog();
    await flush();
    expect(document.activeElement).toBe(screen.getByLabelText("Ad"));
  });

  it("çift gönderme: onAdd yalnız bir kez çağrılıyor", async () => {
    const { onAdd } = renderDialog();
    await flush();
    fireEvent.click(addButton());
    fireEvent.click(addButton());
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
