// @vitest-environment jsdom
//
// Beş pencere ortak `Modal`'a taşındı (tasarım sistemi temeli, spec §6).
// `dialogDataLoss.test.tsx` veri kaybı kapılarını zaten sabitliyor; bu dosya
// taşımayla GELEN davranışı sabitliyor: her pencere başlığına bağlı bir
// `dialog`, X ve odak dışarıdayken Escape çalışıyor, AddSystem'in ayaktaki
// gönder düğmesi forma bağlı, Ayarlar'da değişiklik varken kapatmak soruyor.

import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppConfig, ChatProject } from "../app-electron/shared/types";
import AddSystemModal from "../src/components/AddSystemModal";
import ChatInstructionsDialog from "../src/components/ChatInstructionsDialog";
import ChatProjectDialog from "../src/components/ChatProjectDialog";
import ConfirmDialog from "../src/components/ConfirmDialog";
import SettingsModal from "../src/components/SettingsModal";
import { LanguageProvider } from "../src/i18n";
import { DIALOG_CONFIRM_BUTTON, DIALOG_DANGER_BUTTON } from "../src/ui/buttons";

const goTo = (name: string) => fireEvent.click(screen.getByRole("tab", { name }));

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

const DISCARD_TITLE = "Değişiklikleri at?";

function wrap(ui: React.ReactNode) {
  return render(<LanguageProvider language="tr">{ui}</LanguageProvider>);
}

function setApi(api: Record<string, unknown>) {
  (window as unknown as { api: unknown }).api = api;
}

function outsideButton(): HTMLButtonElement {
  const button = document.createElement("button");
  button.textContent = "dışarıda";
  document.body.appendChild(button);
  return button;
}

/** Tek açık pencerenin `aria-labelledby` ile bağlı başlık metni. */
function dialogTitle(): string {
  const dialog = screen.getByRole("dialog");
  return document.getElementById(dialog.getAttribute("aria-labelledby") ?? "")?.textContent ?? "";
}

describe("ConfirmDialog", () => {
  function mount(danger?: boolean) {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    wrap(
      <ConfirmDialog
        open
        title="Silinsin mi?"
        message="Geri alınamaz."
        danger={danger}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    return { onConfirm, onCancel };
  }

  it("başlığa bağlı dialog; açılışta odak İptal'de", () => {
    mount();
    expect(dialogTitle()).toBe("Silinsin mi?");
    expect(screen.getByText("Geri alınamaz.")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "İptal" }));
  });

  it("Onayla onConfirm'ü, İptal ve X onCancel'ı çağırıyor", () => {
    const { onConfirm, onCancel } = mount();
    fireEvent.click(screen.getByRole("button", { name: "Onayla" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("odak dışarıdayken de Escape onCancel'ı çağırıyor", () => {
    const { onCancel } = mount();
    const outside = outsideButton();
    outside.focus();
    fireEvent.keyDown(outside, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("yıkıcıyken kırmızı dolgu, değilken vurgu dolgusu", () => {
    mount(true);
    expect(screen.getByRole("button", { name: "Onayla" }).className).toBe(DIALOG_DANGER_BUTTON);
    cleanup();
    document.body.innerHTML = "";
    mount(false);
    expect(screen.getByRole("button", { name: "Onayla" }).className).toBe(DIALOG_CONFIRM_BUTTON);
  });
});

describe("ChatInstructionsDialog", () => {
  function mount() {
    setApi({
      readTextFile: vi.fn(() => Promise.resolve({ ok: true, content: "A" })),
      writeTextFile: vi.fn(() => Promise.resolve({ ok: true }))
    });
    const onClose = vi.fn();
    wrap(<ChatInstructionsDialog cwd={"C:\\proje"} onClose={onClose} onSaved={vi.fn()} />);
    return { onClose };
  }

  it("başlıklı dialog, dosya yolu görünüyor, değişiklik yokken X kapatıyor", async () => {
    const { onClose } = mount();
    await screen.findByDisplayValue("A");
    expect(dialogTitle()).toBe("Proje yönergeleri");
    expect(screen.getByText("C:\\proje\\AGENTS.md")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("odak dışarıdayken Escape, değişiklik varsa önce soruyor", async () => {
    const { onClose } = mount();
    fireEvent.change(await screen.findByDisplayValue("A"), { target: { value: "AB" } });
    const outside = outsideButton();
    outside.focus();
    fireEvent.keyDown(outside, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(DISCARD_TITLE)).toBeTruthy();
  });
});

describe("ChatProjectDialog", () => {
  const PROJECT = { id: "p1", name: "Fatura", instructions: "Kısa yaz." } as ChatProject;

  function mount() {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const onDelete = vi.fn();
    wrap(<ChatProjectDialog project={PROJECT} onClose={onClose} onSave={onSave} onDelete={onDelete} />);
    return { onClose, onSave, onDelete };
  }

  it("etiket girdiye bağlı; adda Enter kırpılmış adla kaydedip kapatıyor", () => {
    const { onClose, onSave } = mount();
    expect(dialogTitle()).toBe("Proje");
    const nameInput = screen.getByLabelText("Proje adı");
    expect(document.activeElement).toBe(nameInput);
    fireEvent.change(nameInput, { target: { value: "  Yeni ad  " } });
    fireEvent.keyDown(nameInput, { key: "Enter" });
    expect(onSave).toHaveBeenCalledWith("Yeni ad", "Kısa yaz.");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("silme iki aşamalı ve AYNI pencerenin içinde", () => {
    const { onClose, onDelete } = mount();
    fireEvent.click(screen.getByRole("button", { name: "Projeyi sil" }));
    expect(screen.getByText(/Emin misin\?/)).toBeTruthy();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Evet, sil" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("değişiklik varken X önce soruyor", () => {
    const { onClose } = mount();
    fireEvent.change(screen.getByLabelText("Proje talimatı"), { target: { value: "Uzun yaz." } });
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(DISCARD_TITLE)).toBeTruthy();
  });
});

describe("AddSystemModal", () => {
  function mount() {
    const api = {
      addManualSystem: vi.fn(() => Promise.resolve({ id: "m1" })),
      updateManualSystem: vi.fn(() => Promise.resolve(null))
    };
    setApi(api);
    const onClose = vi.fn();
    const onAdded = vi.fn();
    wrap(<AddSystemModal open onClose={onClose} onAdded={onAdded} />);
    return { api, onClose, onAdded };
  }

  it("başlık, etiketli ilk alan odakta, tür düğmesi basılı hâlini bildiriyor", () => {
    mount();
    expect(dialogTitle()).toBe("Yeni SAP Sistemi Ekle");
    expect(document.activeElement).toBe(screen.getByLabelText("Görünen Ad"));
    expect(screen.getByRole("button", { name: "On-Premise" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "BTP / Cloud" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("ayaktaki Ekle düğmesi formun dışında ama formu gönderiyor", async () => {
    const { api, onClose, onAdded } = mount();
    fireEvent.change(screen.getByLabelText("Görünen Ad"), { target: { value: "Test DEV" } });
    fireEvent.change(screen.getByLabelText("Sistem ID (SID)"), { target: { value: "t01" } });
    fireEvent.change(screen.getByLabelText("Host (IP veya hostname)"), { target: { value: "sap.example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Ekle" }));
    await waitFor(() =>
      expect(api.addManualSystem).toHaveBeenCalledWith({
        name: "Test DEV",
        systemId: "T01",
        type: "onprem",
        host: "sap.example.com",
        diagPort: 3200,
        adtUrl: null
      })
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onAdded).toHaveBeenCalledWith("m1");
  });

  it("DIAG portu geçersizse girdi aria-invalid, hata ona bağlı, Ekle kapalı", () => {
    mount();
    fireEvent.change(screen.getByLabelText("Görünen Ad"), { target: { value: "Test DEV" } });
    fireEvent.change(screen.getByLabelText("Sistem ID (SID)"), { target: { value: "T01" } });
    fireEvent.change(screen.getByLabelText("Host (IP veya hostname)"), { target: { value: "sap.example.com" } });
    const port = screen.getByLabelText("SAPGUI Dispatcher (DIAG) Portu");
    fireEvent.change(port, { target: { value: "abc" } });
    expect(port.getAttribute("aria-invalid")).toBe("true");
    const described = (port.getAttribute("aria-describedby") ?? "")
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent);
    expect(described).toContain("Port 1–65535 arasında bir sayı olmalı.");
    expect(screen.getByRole("button", { name: "Ekle" }).hasAttribute("disabled")).toBe(true);
  });
});

describe("SettingsModal", () => {
  const CONFIG = {
    language: "tr",
    theme: "dark",
    projectsBaseDir: "C:\\projeler",
    axetWorkspaceDir: "C:\\axet",
    chatDisplayName: "Deneme",
    chatFontSize: "md",
    chatDensity: "comfortable",
    axetCommand: "axet",
    terminal: "cmd",
    landscapePathOverride: null,
    sapShcutPathOverride: null,
    autoCheckUpdates: true,
    connectorEnabled: { outlook: true }
  } as unknown as AppConfig;

  function mount() {
    setApi({
      getAppVersion: vi.fn(() => Promise.resolve("1.0.0")),
      getLastUpdateStatus: vi.fn(() => Promise.resolve({ phase: "idle" })),
      onUpdateStatus: vi.fn(() => () => {}),
      validateOverridePaths: vi.fn(() => Promise.resolve({ landscape: null, sapShcut: null })),
      pickFolder: vi.fn(() => Promise.resolve(null)),
      checkForUpdates: vi.fn(() => Promise.resolve()),
      downloadUpdate: vi.fn(() => Promise.resolve()),
      installUpdate: vi.fn(() => Promise.resolve())
    });
    const onClose = vi.fn();
    const onSave = vi.fn(() => Promise.resolve());
    wrap(
      <SettingsModal
        open
        onClose={onClose}
        config={CONFIG}
        onSave={onSave}
        onExportManualSystems={vi.fn(() => Promise.resolve())}
        onImportManualSystems={vi.fn(() => Promise.resolve())}
      />
    );
    return { onClose, onSave };
  }

  it("Ayarlar başlıklı dialog; değişiklik yokken X kapatıyor", () => {
    const { onClose } = mount();
    expect(dialogTitle()).toBe("Ayarlar");
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("değişiklik varken rozet çıkıyor; odak dışarıdayken Escape soruyor; At ve Kapat kaydetmeden kapatıyor", () => {
    const { onClose, onSave } = mount();
    goTo("Terminal");
    fireEvent.change(screen.getByDisplayValue("axet"), { target: { value: "axet-yeni" } });
    expect(screen.getByText("Kaydedilmemiş değişiklik var")).toBeTruthy();
    const outside = outsideButton();
    outside.focus();
    fireEvent.keyDown(outside, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(DISCARD_TITLE)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "At ve Kapat" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("Kaydet yalnızca düzenlenen alanları yolluyor ve kapatıyor", async () => {
    const { onClose, onSave } = mount();
    goTo("Terminal");
    fireEvent.change(screen.getByDisplayValue("axet"), { target: { value: "axet-yeni" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    const patch = (onSave.mock.calls[0] as unknown[])[0] as Partial<AppConfig>;
    expect(patch.axetCommand).toBe("axet-yeni");
    expect("connectorEnabled" in patch).toBe(false);
  });
});

describe("taşınan dosyalar", () => {
  const ROOT = path.join(__dirname, "..", "src");
  const FILES = [
    "components/ConfirmDialog.tsx",
    "components/ChatInstructionsDialog.tsx",
    "components/ChatProjectDialog.tsx",
    "components/AddSystemModal.tsx",
    "components/SettingsModal.tsx",
    "components/CredentialsModal.tsx",
    "components/CertTrustDialog.tsx",
    "components/TierPromptModal.tsx",
    "components/RoleModal.tsx",
    // Bu turda ortak Modal'a taşınanlar (spec §3).
    "components/AppConnectionsModal.tsx",
    "components/GlobalSkillsModal.tsx",
    "components/UpdatePromptModal.tsx",
    "terminal/NewPaneDialog.tsx"
  ];

  it("kendi arka planını, katmanını ve px yazı boyunu taşımıyor", () => {
    for (const file of FILES) {
      const src = readFileSync(path.join(ROOT, file), "utf8");
      expect(src, file).not.toMatch(/text-\[[0-9.]+px\]/);
      expect(src, file).not.toMatch(/fixed inset-0/);
      expect(src, file).not.toMatch(/z-\[\d+\]/);
      expect(src, file).not.toMatch(/import ConfirmDialog/);
    }
  });

  // Boy `size` ölçeğinden geliyor (sm/md/lg/xl); elle piksel genişlik,
  // pencereleri yeniden birbirinden farklı boylara dağıtırdı.
  it("genişliği elle vermiyor", () => {
    for (const file of FILES) {
      const src = readFileSync(path.join(ROOT, file), "utf8");
      expect(src, file).not.toMatch(/\swidth=\{/);
    }
  });
});
