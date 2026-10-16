// @vitest-environment jsdom
//
// DataPrivacySection UI testleri — inceleme düzeltmeleri (2026-10-17)
// - Dört satır render oluyor
// - Temizle düğmesi alertdialog açıyor
// - İptal → IPC çağrılmıyor
// - SAP yazma ve axet-code satırlarında silme düğmesi YOK
// - axet-code satırında "Klasörü aç" var

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import DataPrivacySection from "../src/components/settings/DataPrivacySection";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

// window.api sahte
const mockSummary = {
  chat: { count: 3, bytes: 2048 },
  log: { bytes: 1024 },
  sapWrite: { projects: 2, bytes: 500 },
  axetDb: { count: 1, bytes: 4096 }
};

const mockClear = vi.fn(() => Promise.resolve({ ok: true }));
const mockReveal = vi.fn(() => Promise.resolve());

beforeEach(() => {
  vi.clearAllMocks();
  (window as unknown as Record<string, unknown>).api = {
    dataPrivacySummary: vi.fn(() => Promise.resolve(mockSummary)),
    dataPrivacyClear: mockClear,
    dataPrivacyReveal: mockReveal
  };
});

function wrap() {
  return render(
    <LanguageProvider language="tr">
      <DataPrivacySection />
    </LanguageProvider>
  );
}

describe("DataPrivacySection — dort satir", () => {
  it("dort kart basligi gorunuyor", async () => {
    wrap();
    await waitFor(() => {
      expect(screen.getByText("Sohbet geçmişi")).toBeTruthy();
      expect(screen.getByText("Uygulama günlüğü")).toBeTruthy();
      expect(screen.getByText("SAP yazma günlükleri")).toBeTruthy();
      expect(screen.getByText("axet-code oturumları")).toBeTruthy();
    });
  });
});

describe("DataPrivacySection — temizle dugmesi alertdialog aciyor", () => {
  it("sohbet temizle → role=alertdialog aciliyor", async () => {
    wrap();
    await waitFor(() => screen.getByText("Sohbet geçmişi"));
    // "Sohbet geçmişini temizle" düğmesini bul
    const clearBtn = screen.getByRole("button", { name: /sohbet geçmişini temizle/i });
    fireEvent.click(clearBtn);
    // alertdialog açılıyor
    await waitFor(() => {
      const dialog = document.querySelector("[role='alertdialog']");
      expect(dialog).not.toBeNull();
    });
  });

  it("iptal → IPC cagrilmiyor", async () => {
    wrap();
    await waitFor(() => screen.getByText("Sohbet geçmişi"));
    fireEvent.click(screen.getByRole("button", { name: /sohbet geçmişini temizle/i }));
    await waitFor(() => {
      expect(document.querySelector("[role='alertdialog']")).not.toBeNull();
    });
    // İptal düğmesi (ModalCancelButton "İptal" metnini kullanıyor; tam eşleşme)
    const cancelBtn = screen.getByRole("button", { name: "İptal" });
    fireEvent.click(cancelBtn);
    expect(mockClear).not.toHaveBeenCalled();
  });
});

describe("DataPrivacySection — SAP ve axet-code satirlarinda silme yok", () => {
  it("SAP yazma satirinda 'temizle' butonu yok", async () => {
    wrap();
    await waitFor(() => screen.getByText("SAP yazma günlükleri"));
    // SAP satırındaki bir düğme silme rengi/etiketi içermemeli
    // Yalnızca "Klasörü aç" var
    const sapCard = screen.getByText("SAP yazma günlükleri").closest("div[class]")?.parentElement;
    const btnsInCard = sapCard?.querySelectorAll("button") ?? [];
    const hasTrash = Array.from(btnsInCard).some(
      (b) => b.textContent?.match(/temizle/i) || b.querySelector("svg[data-lucide='trash-2']")
    );
    expect(hasTrash).toBe(false);
  });

  it("axet-code satirinda 'temizle' butonu yok", async () => {
    wrap();
    await waitFor(() => screen.getByText("axet-code oturumları"));
    const axetCard = screen.getByText("axet-code oturumları").closest("div[class]")?.parentElement;
    const btnsInCard = axetCard?.querySelectorAll("button") ?? [];
    const hasTrash = Array.from(btnsInCard).some(
      (b) => b.textContent?.match(/temizle/i)
    );
    expect(hasTrash).toBe(false);
  });

  it("axet-code satirinda 'Klasoru ac' butonu var", async () => {
    wrap();
    await waitFor(() => screen.getByText("axet-code oturumları"));
    // "Klasörü aç" ikonu var mı? aria-label ile kontrol
    const revealBtns = screen.getAllByRole("button", { name: /klasörü aç/i });
    // En az 3: chat, log, sapWrite, axetDb satırlarında olmalı
    expect(revealBtns.length).toBeGreaterThanOrEqual(4);
  });
});

describe("DataPrivacySection — ConfirmDialog role=alertdialog", () => {
  it("onay penceresi role alertdialog tasiyor", async () => {
    wrap();
    await waitFor(() => screen.getByText("Sohbet geçmişi"));
    fireEvent.click(screen.getByRole("button", { name: /sohbet geçmişini temizle/i }));
    await waitFor(() => {
      const dialog = document.querySelector("[role='alertdialog']");
      expect(dialog).not.toBeNull();
    });
  });
});
