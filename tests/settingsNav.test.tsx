// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "../src/i18n";
import SettingsNav from "../src/components/settings/SettingsNav";
import type { SettingsSectionId } from "../src/components/settings/settingsSections";

afterEach(cleanup);

function Harness({ dirty = new Set<SettingsSectionId>() }: { dirty?: Set<SettingsSectionId> }) {
  const [value, setValue] = useState<SettingsSectionId>("general");
  return (
    <LanguageProvider language="tr">
      <SettingsNav value={value} onChange={setValue} dirty={dirty} idPrefix="ayar" footer={<span>Sürüm 1.0</span>} />
    </LanguageProvider>
  );
}

const tabs = () => screen.getAllByRole("tab");

describe("SettingsNav", () => {
  it("dikey sekme listesi, sekiz sekme, adı var", () => {
    render(<Harness />);
    const list = screen.getByRole("tablist");
    expect(list.getAttribute("aria-orientation")).toBe("vertical");
    expect(list.getAttribute("aria-label")).toBe("Ayar bölümleri");
    expect(tabs()).toHaveLength(8);
    expect(tabs()[0].textContent).toContain("Genel");
    expect(screen.getByText("Sürüm 1.0")).toBeTruthy();
  });

  it("seçili sekme: aria-selected, tabindex 0, panele bağlı; ötekiler -1", () => {
    render(<Harness />);
    const [first, second] = tabs();
    expect(first.getAttribute("aria-selected")).toBe("true");
    expect(first.getAttribute("tabindex")).toBe("0");
    expect(first.id).toBe("ayar-tab-general");
    expect(first.getAttribute("aria-controls")).toBe("ayar-panel");
    expect(second.getAttribute("aria-selected")).toBe("false");
    expect(second.getAttribute("tabindex")).toBe("-1");
  });

  it("tıklama seçiyor", () => {
    render(<Harness />);
    fireEvent.click(tabs()[4]);
    expect(tabs()[4].getAttribute("aria-selected")).toBe("true");
  });

  it("ok tuşları geziyor ve uçlarda dönüyor; Home/End", () => {
    render(<Harness />);
    tabs()[0].focus();
    fireEvent.keyDown(tabs()[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(tabs()[1]);
    expect(tabs()[1].getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(tabs()[1], { key: "End" });
    expect(document.activeElement).toBe(tabs()[7]);
    fireEvent.keyDown(tabs()[7], { key: "ArrowDown" });
    expect(document.activeElement).toBe(tabs()[0]);
    fireEvent.keyDown(tabs()[0], { key: "ArrowUp" });
    expect(document.activeElement).toBe(tabs()[7]);
    fireEvent.keyDown(tabs()[7], { key: "Home" });
    expect(document.activeElement).toBe(tabs()[0]);
  });

  it("değişiklikli bölümde nokta var, ötekilerde yok", () => {
    render(<Harness dirty={new Set<SettingsSectionId>(["terminal"])} />);
    const dots = document.querySelectorAll("[data-dirty-dot]");
    expect(dots).toHaveLength(1);
    expect(tabs()[4].contains(dots[0])).toBe(true);
    expect(dots[0].getAttribute("aria-hidden")).toBe("true");
  });

  it("seçili satır kenar çubuğunun seçim rengiyle", () => {
    render(<Harness />);
    expect(tabs()[0].className).toContain("bg-[var(--accent-glow)]");
    expect(tabs()[1].className).not.toContain("bg-[var(--accent-glow)]");
  });
});
