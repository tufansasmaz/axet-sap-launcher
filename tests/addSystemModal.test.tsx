// @vitest-environment jsdom
// AddSystemModal: düzenleme kipinde dirty başlangıcı (spec 2026-10-16 İş 4.9).
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EditingManualSystem } from "../src/components/AddSystemModal";
import AddSystemModal from "../src/components/AddSystemModal";
import { LanguageProvider } from "../src/i18n";

const win = window as unknown as { api: unknown };
afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

const EDITING: EditingManualSystem = {
  id: "uuid-1",
  name: "Test Sistemi",
  systemId: "TST",
  type: "onprem",
  host: "10.0.0.1",
  diagPort: 3200,
  adtUrl: null
};

function mount(editing: EditingManualSystem | null = null) {
  const onClose = vi.fn();
  const onAdded = vi.fn();
  win.api = {
    addManualSystem: vi.fn(async () => ({ id: "new-uuid" })),
    updateManualSystem: vi.fn(async () => ({ id: editing?.id ?? "new-uuid" }))
  };
  render(
    <LanguageProvider language="tr">
      <AddSystemModal open editing={editing} onClose={onClose} onAdded={onAdded} />
    </LanguageProvider>
  );
  return { onClose, onAdded };
}

describe("AddSystemModal düzenleme kipi", () => {
  it("düzenleme kipinde açılışta 'değişiklikleri at?' onayı çıkmıyor", async () => {
    const { onClose } = mount(EDITING);
    // Düzenleme kipinde hemen X'e tıkla. dirty=false ise onay açılmaz, onClose doğrudan çağrılır.
    // dirty=true ise "Değişiklikleri at?" onay penceresi açılır ve onClose çağrılmaz.
    fireEvent.click(screen.getByRole("button", { name: /kapat|close|×|x/i }));
    // Onay penceresi açılmamalı: "Değişiklikleri at?" metni görünmemeli.
    expect(screen.queryByText(/değişiklikleri at/i)).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("yeni ekleme kipinde alanlar doldurunca 'değişiklikleri at?' çıkıyor (sağlama)", async () => {
    const { onClose } = mount(null);
    // "Görünen Ad" alanına bir şeyler yaz: dirty=true olur.
    fireEvent.change(screen.getByRole("textbox", { name: /görünen ad/i }), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: /kapat|close|×|x/i }));
    // Onay penceresi açılmalı.
    expect(screen.queryByText(/değişiklikleri at/i)).not.toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });
});
