// @vitest-environment jsdom
//
// Giriş penceresi ortak Modal'a geçti (Logon sağ taraf spec'i §4.2). İçerik
// aynı kaldı; yeni olan, doğrulama sürerken pencerenin kapanmaması.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import CredentialsModal from "../src/components/CredentialsModal";
import type { SapService } from "../app-electron/shared/types";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

const SERVICE: SapService = {
  uuid: "svc-a",
  systemId: "D01",
  name: "D01 Geliştirme",
  type: "SAPGUI",
  host: "d01.example.test",
  port: 3200,
  raw: "",
  routerId: null,
  routerString: null,
  username: "TESTUSER"
};

function mount(overrides: Partial<Parameters<typeof CredentialsModal>[0]> = {}) {
  const props = {
    open: true,
    service: SERVICE,
    connecting: false,
    errorMessage: null,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    loadDefaults: vi.fn(() => Promise.resolve({ username: "TESTUSER", password: "secret", client: "100" })),
    ...overrides
  };
  render(
    <LanguageProvider language="tr">
      <CredentialsModal {...props} />
    </LanguageProvider>
  );
  return props;
}

const loaded = () => waitFor(() => expect((screen.getByLabelText("Kullanıcı Adı") as HTMLInputElement).value).toBe("TESTUSER"));

describe("CredentialsModal", () => {
  it("kapalıyken ya da sistem yokken hiçbir şey çizmiyor", () => {
    mount({ open: false });
    expect(screen.queryByRole("dialog")).toBeNull();
    cleanup();
    mount({ service: null });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("dialog, başlık ve yüklenen varsayılanlar", async () => {
    mount();
    expect(screen.getByRole("dialog", { name: "Sisteme Bağlan" })).toBeTruthy();
    await loaded();
    expect((screen.getByLabelText("Şifre") as HTMLInputElement).value).toBe("secret");
    expect((screen.getByLabelText("Client") as HTMLInputElement).value).toBe("100");
  });

  it("Escape kapatıyor", async () => {
    const props = mount();
    await loaded();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("doğrulama sürerken kapanmıyor", async () => {
    const props = mount({ connecting: true });
    await waitFor(() => expect(props.loadDefaults).toHaveBeenCalled());
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(props.onClose).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "İptal" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /Doğrulanıyor/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("Bağlan formu gönderiyor", async () => {
    const props = mount();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Bağlan" }));
    expect(props.onSubmit).toHaveBeenCalledWith("TESTUSER", "secret", "100");
  });

  it("şifre göster/gizle düğmesinin adı var", async () => {
    mount();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Şifreyi göster" }));
    expect((screen.getByLabelText("Şifre") as HTMLInputElement).type).toBe("text");
    expect(screen.getByRole("button", { name: "Şifreyi gizle" })).toBeTruthy();
  });

  it("ASCII dışı şifrede uyarı çıkıyor ama Bağlan açık kalıyor", async () => {
    mount();
    await loaded();
    fireEvent.change(screen.getByLabelText("Şifre"), { target: { value: "şifre" } });
    expect(screen.getByText(/Şifrede ASCII dışı karakter var: ş\./)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Bağlan" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("hata satırı alert rolüyle okunuyor", async () => {
    mount({ errorMessage: "401 Unauthorized" });
    await loaded();
    expect(screen.getByRole("alert").textContent).toContain("401 Unauthorized");
  });

  it("sabit piksel yazı boyu yok", async () => {
    const { readFileSync } = await import("node:fs");
    expect(readFileSync("src/components/CredentialsModal.tsx", "utf8")).not.toMatch(/text-\[\d+px\]/);
  });
});
