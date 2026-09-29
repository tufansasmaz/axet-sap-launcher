// @vitest-environment jsdom
//
// Kart, sekme ve boş durum (tasarım sistemi temeli, spec §6.4). Sekme
// testleri klavyeyi sabitliyor: ok tuşları seçimi VE odağı birlikte
// taşıyor, uçlarda başa/sona dönüyor, Home/End ilk/son sekmeye gidiyor.

import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import { Card } from "../src/ui/Card";
import { EmptyState } from "../src/ui/EmptyState";
import { Tabs } from "../src/ui/Tabs";

afterEach(cleanup);

function wrap(ui: React.ReactNode) {
  return render(<LanguageProvider language="tr">{ui}</LanguageProvider>);
}

describe("Card", () => {
  it("kart yüzeyi, 12px köşe, ince kenarlık, iç dolgu", () => {
    wrap(<Card data-testid="kart">içerik</Card>);
    const card = screen.getByTestId("kart");
    for (const cls of ["bg-card", "rounded-xl", "border", "border-line", "p-5"]) {
      expect(card.classList.contains(cls)).toBe(true);
    }
    expect(card.textContent).toBe("içerik");
  });

  it("flush iç dolguyu kaldırıyor, ek sınıf ekleniyor", () => {
    wrap(
      <Card data-testid="kart" flush className="overflow-hidden">
        x
      </Card>
    );
    const card = screen.getByTestId("kart");
    expect(card.classList.contains("p-5")).toBe(false);
    expect(card.classList.contains("overflow-hidden")).toBe(true);
  });
});

type Section = "genel" | "gorunum" | "gelismis";
const ITEMS = [
  { value: "genel" as const, label: "Genel" },
  { value: "gorunum" as const, label: "Görünüm" },
  { value: "gelismis" as const, label: "Gelişmiş" }
];

function TabsHarness({ onChange }: { onChange?: (v: Section) => void }) {
  const [value, setValue] = useState<Section>("genel");
  return (
    <Tabs
      label="Ayar bölümleri"
      items={ITEMS}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    >
      <p>{`panel:${value}`}</p>
    </Tabs>
  );
}

function NullTabs({ onChange }: { onChange: (v: Section) => boolean | void }) {
  return <Tabs label="Modlar" items={ITEMS} value={null} onChange={onChange} stretch />;
}

describe("Tabs", () => {
  it("roller ve bağlar: tablist etiketi, seçili sekme paneli etiketliyor", () => {
    wrap(<TabsHarness />);
    expect(screen.getByRole("tablist", { name: "Ayar bölümleri" })).toBeTruthy();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.getAttribute("aria-selected"))).toEqual(["true", "false", "false"]);
    const panel = screen.getByRole("tabpanel");
    expect(panel.getAttribute("aria-labelledby")).toBe(tabs[0].id);
    expect(tabs[0].getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.textContent).toBe("panel:genel");
  });

  it("gezici tabindex: yalnızca seçili sekme Tab sırasında", () => {
    wrap(<TabsHarness />);
    expect(screen.getAllByRole("tab").map((t) => t.tabIndex)).toEqual([0, -1, -1]);
  });

  it("tıklama seçiyor", () => {
    const onChange = vi.fn();
    wrap(<TabsHarness onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Gelişmiş" }));
    expect(onChange).toHaveBeenCalledWith("gelismis");
    expect(screen.getByRole("tabpanel").textContent).toBe("panel:gelismis");
  });

  it("sağ ok bir sonrakine, sondan başa dönüyor; odak da taşınıyor", () => {
    wrap(<TabsHarness />);
    const [first, second, third] = screen.getAllByRole("tab");
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(document.activeElement).toBe(second);
    expect(second.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(second, { key: "ArrowRight" });
    fireEvent.keyDown(third, { key: "ArrowRight" });
    expect(document.activeElement).toBe(first);
    expect(first.getAttribute("aria-selected")).toBe("true");
  });

  it("sol ok baştan sona dönüyor; Home ve End uçlara gidiyor", () => {
    wrap(<TabsHarness />);
    const [first, , third] = screen.getAllByRole("tab");
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(third);
    fireEvent.keyDown(third, { key: "Home" });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: "End" });
    expect(document.activeElement).toBe(third);
    expect(screen.getByRole("tabpanel").textContent).toBe("panel:gelismis");
  });

  it("başka tuşlar seçimi değiştirmiyor", () => {
    const onChange = vi.fn();
    wrap(<TabsHarness onChange={onChange} />);
    fireEvent.keyDown(screen.getAllByRole("tab")[0], { key: "a" });
    fireEvent.keyDown(screen.getAllByRole("tab")[0], { key: "ArrowDown" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("değer yokken hiçbir sekme seçili değil ama ilk sekme Tab ile odaklanabiliyor", () => {
    wrap(<NullTabs onChange={() => {}} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.filter((tab) => tab.getAttribute("aria-selected") === "true")).toHaveLength(0);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
  });

  it("değer yokken sağ ok ilk sekmeyi, sol ok ve End son sekmeyi seçiyor", () => {
    const onChange = vi.fn();
    wrap(<NullTabs onChange={onChange} />);
    const list = screen.getByRole("tablist");
    fireEvent.keyDown(list, { key: "ArrowRight" });
    fireEvent.keyDown(list, { key: "ArrowLeft" });
    fireEvent.keyDown(list, { key: "End" });
    fireEvent.keyDown(list, { key: "Home" });
    expect(onChange.mock.calls.map((call) => call[0])).toEqual(["genel", "gelismis", "gelismis", "genel"]);
  });

  it("onChange false dönerse odak kaymıyor", () => {
    wrap(<NullTabs onChange={() => false} />);
    const [first] = screen.getAllByRole("tab");
    first.focus();
    fireEvent.keyDown(screen.getByRole("tablist"), { key: "End" });
    expect(document.activeElement).toBe(first);
  });

  it("children yoksa panel ve aria-controls yok", () => {
    wrap(<NullTabs onChange={() => {}} />);
    expect(screen.queryByRole("tabpanel")).toBeNull();
    for (const tab of screen.getAllByRole("tab")) expect(tab.getAttribute("aria-controls")).toBeNull();
  });

  it("stretch şeridi tam genişlik yapıyor, sekmeler eşit bölünüyor", () => {
    wrap(<NullTabs onChange={() => {}} />);
    expect(screen.getByRole("tablist").className).toContain("w-full");
    for (const tab of screen.getAllByRole("tab")) expect(tab.className).toContain("flex-1");
  });
});

describe("EmptyState", () => {
  it("başlık, açıklama ve eylem çiziliyor; simge ekran okuyucuya gizli", () => {
    const onAdd = vi.fn();
    const { container } = wrap(
      <EmptyState
        icon={<svg data-testid="simge" />}
        title="Henüz sistem yok"
        description="İlk SAP sistemini ekleyerek başla."
        action={
          <button type="button" onClick={onAdd}>
            Sistem ekle
          </button>
        }
      />
    );
    expect(screen.getByText("Henüz sistem yok")).toBeTruthy();
    expect(screen.getByText("İlk SAP sistemini ekleyerek başla.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sistem ekle" }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("simge").parentElement?.getAttribute("aria-hidden")).toBe("true");
    expect(container.textContent).not.toContain("undefined");
  });

  it("yalnız başlıkla da çiziliyor", () => {
    wrap(<EmptyState title="Boş" />);
    expect(screen.getByText("Boş")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
