// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "../src/i18n";
import SapGuiScriptingHome from "../src/components/SapGuiScriptingHome";
import ScriptSidebar from "../src/components/ScriptSidebar";
import { ScriptStoreProvider } from "../src/stores/scriptStore";
import { installScriptApi, SESSION, type ScriptApiFake } from "./scriptApiFake";

// Taşıma (Görev 12) yalnızca bu fonksiyonu değiştiriyor; `it` gövdeleri
// taşımadan önce ve sonra aynı kalmalı (spec §5.4).
function renderScript() {
  return render(
    <LanguageProvider language="tr">
      <ScriptStoreProvider>
        <ScriptSidebar />
        <SapGuiScriptingHome activeSap={null} />
      </ScriptStoreProvider>
    </LanguageProvider>
  );
}

let api: ScriptApiFake;
beforeEach(() => {
  api = installScriptApi();
});
afterEach(cleanup);

async function openSession() {
  fireEvent.click(await screen.findByRole("button", { name: "S4D Geliştirme" }));
  fireEvent.click(await screen.findByRole("button", { name: /^SE38 S4D/ }));
}

// Ağaç satırındaki açma oku: adın durduğu satırın ilk düğmesi. Ad birden
// fazla yerde çıkabiliyor (kökün adı denetçide de yazıyor); ağaç DOM'da önce.
function chevronOf(name: string) {
  return screen.getAllByText(name)[0].parentElement!.querySelector("button")!;
}

describe("Script ağacı (taşıma öncesi davranış)", () => {
  it("oturum seçilince ağacın kökü o oturumdan okunuyor", async () => {
    renderScript();
    await openSession();
    expect((await screen.findAllByText("wnd[0]"))[0]).toBeTruthy();
    expect(api.getGuiScriptNode).toHaveBeenCalledWith(0, 0, null, undefined);
    expect(api.getGuiScriptScreen).toHaveBeenCalledWith(0, 0);
  });

  it("düğüm açılınca çocukları okunuyor", async () => {
    renderScript();
    await openSession();
    await screen.findAllByText("wnd[0]");
    fireEvent.click(chevronOf("wnd[0]"));
    expect(await screen.findByText("usr")).toBeTruthy();
    fireEvent.click(chevronOf("usr"));
    expect(await screen.findByText("RS38M-PROGRAMM")).toBeTruthy();
    expect(api.getGuiScriptNode).toHaveBeenCalledWith(0, 0, "wnd[0]/usr", undefined);
  });

  it("seçili oturum ve öğe kenar çubuğunun seçim diliyle çiziliyor (spec §6.5)", async () => {
    renderScript();
    await openSession();
    const session = screen.getByRole("button", { name: /^SE38 S4D/ });
    expect(session.getAttribute("aria-current")).toBe("true");
    expect(session.querySelector("[data-active-line]")).not.toBeNull();
    expect(session.classList.contains("bg-[var(--accent-glow)]")).toBe(true);
    expect(session.classList.contains("border-l-2")).toBe(false);

    const row = (await screen.findAllByText("wnd[0]"))[0].parentElement!;
    expect(row.querySelector("[data-active-line]")).toBeNull();
    fireEvent.click(row);
    const selected = screen.getAllByText("wnd[0]")[0].parentElement!;
    expect(selected.getAttribute("aria-current")).toBe("true");
    expect(selected.querySelector("[data-active-line]")).not.toBeNull();
  });
});

// `show` false: Script modundan çıkıldı, store yerinde (App'teki düzen).
function scriptTree(show: boolean) {
  return (
    <LanguageProvider language="tr">
      <ScriptStoreProvider>
        {show && <ScriptSidebar />}
        {show && <SapGuiScriptingHome activeSap={null} />}
      </ScriptStoreProvider>
    </LanguageProvider>
  );
}

describe("Script'e dönüş", () => {
  it("kapalı bir bağlantının eski oturum listesi dönüşte atılıyor, açılınca yeniden okunuyor", async () => {
    const { rerender } = render(scriptTree(true));
    const conn = await screen.findByRole("button", { name: "S4D Geliştirme" });
    fireEvent.click(conn);
    await screen.findByRole("button", { name: /^SE38 S4D/ });
    fireEvent.click(conn);

    rerender(scriptTree(false));
    api.listGuiScriptSessions.mockResolvedValue({
      ok: true,
      sessions: [{ ...SESSION, info: { ...SESSION.info, Transaction: "SE80" } }]
    });
    rerender(scriptTree(true));
    // Dönüş doğrulaması bağlantıları yeniden okuyana kadar bekleniyor.
    await waitFor(() => expect(api.listGuiScriptConnections).toHaveBeenCalledTimes(2));
    await act(async () => {});

    fireEvent.click(await screen.findByRole("button", { name: "S4D Geliştirme" }));
    expect(await screen.findByRole("button", { name: /^SE80 S4D/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^SE38 S4D/ })).toBeNull();
  });
});
