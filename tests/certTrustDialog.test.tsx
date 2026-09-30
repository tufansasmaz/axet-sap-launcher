// @vitest-environment jsdom
//
// Sertifika sorusu ortak Modal'a geçti (Logon sağ taraf spec'i §4.2). Karar
// anı: varsayılan odak İptal'de, Escape yalnız bu soruyu kapatıyor.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import CertTrustDialog from "../src/components/CertTrustDialog";
import CredentialsModal from "../src/components/CredentialsModal";
import type { CertTrustPrompt, SapService } from "../app-electron/shared/types";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

const PROMPT: CertTrustPrompt = {
  kind: "untrusted",
  key: "d01.example.test:44300",
  host: "d01.example.test",
  port: 44300,
  fingerprint: "ab".repeat(32),
  previousFingerprint: null,
  subject: "CN=d01.example.test",
  issuer: "CN=Example CA",
  validFrom: "2026-01-01",
  validTo: "2027-01-01",
  selfSigned: false,
  reason: "UNABLE_TO_VERIFY_LEAF_SIGNATURE"
};

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

function mount(overrides: Partial<Parameters<typeof CertTrustDialog>[0]> = {}) {
  const props = { prompt: PROMPT, busy: false, onTrust: vi.fn(), onCancel: vi.fn(), ...overrides };
  render(
    <LanguageProvider language="tr">
      <CertTrustDialog {...props} />
    </LanguageProvider>
  );
  return props;
}

describe("CertTrustDialog", () => {
  it("soru yokken hiçbir şey çizmiyor", () => {
    mount({ prompt: null });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("başlık dialog'un adı, odak İptal'de", () => {
    mount();
    expect(screen.getByRole("dialog", { name: "SAP sertifikası doğrulanamadı" })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "İptal" }));
  });

  it("Escape ve İptal onCancel'ı çağırıyor", () => {
    const props = mount();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    expect(props.onCancel).toHaveBeenCalledTimes(2);
  });

  it("Güven düğmesi onTrust'ı çağırıyor", () => {
    const props = mount();
    fireEvent.click(screen.getByRole("button", { name: "Bu sertifikaya güven ve bağlan" }));
    expect(props.onTrust).toHaveBeenCalledTimes(1);
  });

  it("meşgulken iki düğme kapalı, Escape etkisiz", () => {
    const props = mount({ busy: true });
    expect((screen.getByRole("button", { name: "İptal" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Bu sertifikaya güven ve bağlan" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(props.onCancel).not.toHaveBeenCalled();
  });

  it("değişen sertifikada önceki parmak izi de gösteriliyor", () => {
    mount({ prompt: { ...PROMPT, kind: "changed", previousFingerprint: "cd".repeat(32) } });
    expect(screen.getByRole("dialog", { name: "SAP sertifikası değişti" })).toBeTruthy();
    expect(screen.getByText("Önceki parmak izi")).toBeTruthy();
    expect(screen.getByText(Array(32).fill("CD").join(":"))).toBeTruthy();
  });

  it("giriş penceresinin üstünde: Escape yalnız sertifika sorusunu kapatıyor", async () => {
    const onClose = vi.fn();
    const onCancel = vi.fn();
    const tree = (prompt: CertTrustPrompt | null) => (
      <LanguageProvider language="tr">
        <CredentialsModal
          open
          service={SERVICE}
          connecting={false}
          errorMessage={null}
          onClose={onClose}
          onSubmit={vi.fn()}
          loadDefaults={() => Promise.resolve({ username: "TESTUSER", password: "secret", client: "100" })}
        />
        <CertTrustDialog prompt={prompt} onTrust={vi.fn()} onCancel={onCancel} />
      </LanguageProvider>
    );
    const { rerender } = render(tree(null));
    await waitFor(() => expect((screen.getByLabelText("Kullanıcı Adı") as HTMLInputElement).value).toBe("TESTUSER"));
    rerender(tree(PROMPT));
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("sabit piksel yazı boyu yok", async () => {
    const { readFileSync } = await import("node:fs");
    expect(readFileSync("src/components/CertTrustDialog.tsx", "utf8")).not.toMatch(/text-\[\d+px\]/);
  });
});
