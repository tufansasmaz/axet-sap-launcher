// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "../src/i18n";
import SapGuiScriptingHome from "../src/components/SapGuiScriptingHome";
import ScriptSidebar from "../src/components/ScriptSidebar";
import { ScriptStoreProvider } from "../src/stores/scriptStore";
import { installScriptApi, type ScriptApiFake } from "./scriptApiFake";

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
});
