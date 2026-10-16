// @vitest-environment jsdom
// "Ajan bu sistemde" öbeği (2026-10-16). Bilgi 8787'nin araç listesinden
// (ana süreç kuruyor); burada yalnız gösterim ve ne zaman sorulduğu.
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import AgentCapabilities from "../src/components/AgentCapabilities";
import { capabilitiesFromTools, type AdtCapabilities } from "../app-electron/shared/adtCapabilities";
import type { ActiveContext } from "../app-electron/shared/types";

const win = window as unknown as { api: unknown };
const originalApi = win.api;

function sapContext(uuid: string, connectedAt = "2026-10-16T10:00:00Z"): ActiveContext {
  return {
    sap: {
      uuid,
      systemId: "D01",
      systemName: "D01",
      customerPath: [],
      host: null,
      client: "100",
      username: "TESTUSER",
      tier: "DEV",
      projectDir: "C:\\p",
      connectedAt,
      verified: true
    },
    gui: null
  };
}

function setup(context: ActiveContext, caps: AdtCapabilities | null) {
  let emit: (c: ActiveContext) => void = () => {};
  const getAdtCapabilities = vi.fn(() => Promise.resolve(caps));
  win.api = {
    getActiveContext: () => Promise.resolve(context),
    onActiveContextChanged: (cb: (c: ActiveContext) => void) => {
      emit = cb;
      return () => {};
    },
    getAdtCapabilities
  };
  render(
    <LanguageProvider language="tr">
      <AgentCapabilities systemUuid="svc-a" />
    </LanguageProvider>
  );
  return { getAdtCapabilities, emit: (c: ActiveContext) => act(() => emit(c)) };
}

afterEach(() => {
  cleanup();
  win.api = originalApi;
});

const running = (tools: string[], role: "module-consultant" | "technical-consultant"): AdtCapabilities => ({
  systemUuid: "svc-a",
  server: "running",
  rows: capabilitiesFromTools(tools, { role, tier: "DEV" })
});

describe("AgentCapabilities", () => {
  it("salt okunur: satırlar ve nedenler", async () => {
    setup(sapContext("svc-a"), running(["adt_get_source", "adt_sql", "adt_dumps", "adt_syntax_check"], "module-consultant"));
    expect(await screen.findByText("Ajan bu sistemde")).toBeTruthy();
    const row = (label: string) => screen.getByText(label).closest("[data-capability]") as HTMLElement;
    expect(row("Tablo okuma").textContent).toContain("Var");
    expect(row("SAP'a yazma").textContent).toContain("Yok — rolünüz modül danışmanı");
    expect(row("Çalıştırma (F8), debug").textContent).toContain("Yok — bu araç henüz yok");
  });

  it("onaylı yazma", async () => {
    setup(sapContext("svc-a"), running(["adt_get_source", "adt_push", "axet_teslim"], "technical-consultant"));
    const write = (await screen.findByText("SAP'a yazma")).closest("[data-capability]") as HTMLElement;
    expect(write.textContent).toContain("her yazma NTT Studio'da onaylanır");
  });

  it("sunucu kapalıysa ✓ yok, bunu söylüyor", async () => {
    setup(sapContext("svc-a"), { systemUuid: "svc-a", server: "down", rows: [] });
    expect(await screen.findByText(/ADT sunucusu çalışmıyor/)).toBeTruthy();
    expect(document.querySelector("[data-capability]")).toBeNull();
  });

  it("başka bir sisteme bağlıyken hiçbir şey göstermiyor ve sormuyor", async () => {
    const { getAdtCapabilities } = setup(sapContext("svc-b"), running(["adt_get_source"], "technical-consultant"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByText("Ajan bu sistemde")).toBeNull();
    expect(getAdtCapabilities).not.toHaveBeenCalled();
  });

  it("yeniden bağlanınca yeniden soruyor", async () => {
    const { getAdtCapabilities, emit } = setup(sapContext("svc-a"), running(["adt_get_source"], "technical-consultant"));
    await screen.findByText("Ajan bu sistemde");
    expect(getAdtCapabilities).toHaveBeenCalledTimes(1);
    emit(sapContext("svc-a", "2026-10-16T11:00:00Z"));
    await waitFor(() => expect(getAdtCapabilities).toHaveBeenCalledTimes(2));
  });
});
