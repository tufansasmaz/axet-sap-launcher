// @vitest-environment jsdom
// Tabs.tsx id kodlaması (§6) ve EmptyState.tsx sıfır koruması (§7).
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Tabs } from "../src/ui/Tabs";
import { EmptyState } from "../src/ui/EmptyState";

afterEach(() => cleanup());

describe("Tabs — güvenli id kodlaması (İş 4.6)", () => {
  it("boşluk ve Türkçe karakter içeren değer geçerli HTML id üretiyor; aria eşleşmesi korunuyor", () => {
    const items = [{ value: "Sap Yazma", label: "SAP Yazma" }, { value: "özel-içerik", label: "Özel" }];
    let selected = "Sap Yazma";
    const { rerender } = render(
      <Tabs label="test" items={items} value={selected} onChange={(v) => { selected = v; }} >
        <div>panel</div>
      </Tabs>
    );
    // Sekme butonları mevcut.
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);

    // Her tab'ın id'si boşluk içermemeli.
    for (const tab of tabs) {
      const id = tab.getAttribute("id") ?? "";
      expect(id).not.toMatch(/\s/);
      // id geçerli: yalnız ASCII alfanümerik, -, _, : ve . içerebilir (HTML5 id rule).
      // encodeURIComponent sonucu % yerine _ kullandığımızdan ID_geçerli.
      expect(id).toMatch(/^[^\s]+$/);
    }

    // Panel labeldby ile tab id eşleşmeli (seçili tab için).
    rerender(
      <Tabs label="test" items={items} value="Sap Yazma" onChange={() => {}} >
        <div>panel</div>
      </Tabs>
    );
    const panel = screen.getByRole("tabpanel");
    const labelledBy = panel.getAttribute("aria-labelledby") ?? "";
    const matchingTab = tabs.find((t) => t.getAttribute("id") === labelledBy);
    expect(matchingTab).toBeTruthy();
  });
});

describe("EmptyState — description=0 basılmıyor (İş 4.7)", () => {
  it("description=0 render edilmiyor", () => {
    render(<EmptyState title="Boş" description={0} />);
    // Yalnız başlık var; "0" DOM'da görünmemeli.
    expect(screen.getByText("Boş")).toBeTruthy();
    expect(screen.queryByText("0")).toBeNull();
  });

  it("description=false render edilmiyor", () => {
    render(<EmptyState title="Boş" description={false} />);
    expect(screen.queryByText("false")).toBeNull();
  });

  it("description='' render edilmiyor", () => {
    render(<EmptyState title="Boş" description="" />);
    // Boş <p> yok; yalnız başlık.
    const paras = document.querySelectorAll("p");
    // Yalnız başlık <p>'si var (1 adet)
    expect(paras).toHaveLength(1);
  });

  it("description metin olarak verilince gösteriliyor", () => {
    render(<EmptyState title="Boş" description="Açıklama metni" />);
    expect(screen.getByText("Açıklama metni")).toBeTruthy();
  });
});
