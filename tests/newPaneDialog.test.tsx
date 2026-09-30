// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import NewPaneDialog from "../src/terminal/NewPaneDialog";
import type { TerminalPaneKind } from "../app-electron/shared/types";

let prevApi: unknown;
let pick: ReturnType<typeof vi.fn>;

beforeEach(() => {
  prevApi = (window as unknown as { api?: unknown }).api;
  pick = vi.fn();
  (window as unknown as { api: unknown }).api = { pickFolder: pick };
});

afterEach(() => {
  cleanup();
  (window as unknown as { api: unknown }).api = prevApi;
});

function renderDialog(defaultKind: TerminalPaneKind = "cmd", defaultCwd = "C:\\a") {
  const onOpen = vi.fn();
  const onCancel = vi.fn();
  const ui = (open: boolean) => (
    <LanguageProvider language="tr">
      <NewPaneDialog open={open} defaultKind={defaultKind} defaultCwd={defaultCwd} onOpen={onOpen} onCancel={onCancel} />
    </LanguageProvider>
  );
  const r = render(ui(true));
  return { onOpen, onCancel, reopen: () => { r.rerender(ui(false)); r.rerender(ui(true)); } };
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

describe("NewPaneDialog", () => {
  it("varsayılan tür seçili; Aç varsayılanlarla gönderiyor", () => {
    const { onOpen } = renderDialog("powershell");
    expect(screen.getByRole("radio", { name: "PowerShell" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Aç" }));
    expect(onOpen).toHaveBeenCalledWith("powershell", "C:\\a");
  });

  it("tür değişiyor, klasör Değiştir ile seçiliyor", async () => {
    const { onOpen } = renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: "axet-code" }));
    pick.mockResolvedValueOnce("C:\\b");
    fireEvent.click(screen.getByRole("button", { name: "Değiştir" }));
    await flush();
    expect(screen.getByTitle("C:\\b")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Aç" }));
    expect(onOpen).toHaveBeenCalledWith("axet", "C:\\b");
  });

  it("klasör seçimi iptal edilirse eski klasör kalıyor", async () => {
    renderDialog();
    pick.mockResolvedValueOnce(null);
    fireEvent.click(screen.getByRole("button", { name: "Değiştir" }));
    await flush();
    expect(screen.getByTitle("C:\\a")).toBeTruthy();
  });

  it("klasör yoksa Aç kapalı ve Enter hiçbir şey göndermiyor", () => {
    const { onOpen } = renderDialog("cmd", "");
    expect(screen.getByText("Klasör seçilmedi")).toBeTruthy();
    const open = screen.getByRole("button", { name: "Aç" }) as HTMLButtonElement;
    expect(open.disabled).toBe(true);
    fireEvent.submit(open.form!);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("Enter formu gönderiyor", () => {
    const { onOpen } = renderDialog();
    fireEvent.submit((screen.getByRole("button", { name: "Aç" }) as HTMLButtonElement).form!);
    expect(onOpen).toHaveBeenCalledWith("cmd", "C:\\a");
  });

  it("İptal onCancel çağırıyor", () => {
    const { onCancel, onOpen } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    expect(onCancel).toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("yeniden açılınca seçimler varsayılana dönüyor", () => {
    const { reopen } = renderDialog("cmd");
    fireEvent.click(screen.getByRole("radio", { name: "axet-code" }));
    reopen();
    expect(screen.getByRole("radio", { name: "cmd" }).getAttribute("aria-checked")).toBe("true");
  });
});
