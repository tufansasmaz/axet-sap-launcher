// @vitest-environment jsdom
// Sorun bildir penceresi (spec 2026-10-16 §3).
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import SupportDialog from "../src/components/SupportDialog";

const win = window as unknown as { api: unknown };
const originalApi = win.api;
afterEach(() => {
  cleanup();
  win.api = originalApi;
});

function setup(chat: Parameters<typeof SupportDialog>[0]["chat"], create = vi.fn(async () => ({ ok: true, zipPath: "C:\\d\\p.zip", draft: "outlook" }))) {
  const preview = vi.fn(async (req: { note: string; chatMarkdown: string | null }) =>
    ["bilgi.json", "ntt-studio.log", "sohbet-zamanlari.json", ...(req.chatMarkdown ? ["sohbet.md"] : []), ...(req.note ? ["not.txt"] : [])]
  );
  win.api = { supportPreview: preview, supportCreate: create };
  const onDone = vi.fn();
  const onClose = vi.fn();
  render(
    <LanguageProvider language="tr">
      <SupportDialog open onClose={onClose} chat={chat} onDone={onDone} />
    </LanguageProvider>
  );
  return { preview, create, onDone, onClose };
}

const CHAT = { title: "Sohbet A", messages: [{ id: "m1", role: "user", content: "merhaba", createdAt: 1 }] as never };

describe("SupportDialog", () => {
  it("dosya listesi; sohbet kutusu varsayılan kapalı; işaretlenince listeye sohbet.md giriyor", async () => {
    const { preview } = setup(CHAT);
    expect(await screen.findByText("ntt-studio.log")).toBeTruthy();
    const box = screen.getByRole("checkbox", { name: "Seçili sohbetin mesajlarını da ekle" }) as HTMLInputElement;
    expect(box.checked).toBe(false);
    expect(screen.queryByText("sohbet.md")).toBeNull();
    fireEvent.click(box);
    expect(await screen.findByText("sohbet.md")).toBeTruthy();
    expect(preview).toHaveBeenLastCalledWith(expect.objectContaining({ chatMarkdown: expect.stringContaining("merhaba") }));
  });

  it("sohbet yoksa kutu kapalı ve devre dışı", async () => {
    setup(null);
    const box = (await screen.findByRole("checkbox")) as HTMLInputElement;
    expect(box.disabled).toBe(true);
  });

  it("oluştur: not ve (işaretliyse) sohbet gidiyor; sonuç bildirilip pencere kapanıyor", async () => {
    const { create, onDone, onClose } = setup(CHAT);
    fireEvent.change(await screen.findByRole("textbox", { name: "Ne oldu?" }), { target: { value: "takıldı" } });
    fireEvent.click(screen.getByRole("button", { name: "Paketi oluştur" }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith({ zipPath: "C:\\d\\p.zip", draft: "outlook" }));
    expect(create).toHaveBeenCalledWith({ note: "takıldı", chatMarkdown: null });
    expect(onClose).toHaveBeenCalled();
  });

  it("sürerken düğme kapalı (çift tık iki paket yapmıyor); hata pencerede gösteriliyor", async () => {
    let resolve: (v: unknown) => void = () => {};
    const create = vi.fn(() => new Promise((r) => (resolve = r)));
    const { onDone } = setup(null, create as never);
    const button = await screen.findByRole("button", { name: "Paketi oluştur" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(create).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ ok: false, message: "disk dolu" }));
    expect(await screen.findByText("Paket oluşturulamadı: disk dolu")).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
  });

describe("SupportDialog — IPC reddi (inceleme M4)", () => {
  it("supportCreate reddederse pencere meşgul kalmıyor, hata gösteriliyor", async () => {
    const create = vi.fn(() => Promise.reject(new Error("ipc koptu")));
    setup(null, create as never);
    fireEvent.click(await screen.findByRole("button", { name: "Paketi oluştur" }));
    expect(await screen.findByText("Paket oluşturulamadı: ipc koptu")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Paketi oluştur" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
});
