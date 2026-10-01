// @vitest-environment jsdom
//
// Proje penceresi kenar çubuğundan açılıp İptal'le kapanınca odak açan
// düğmeye dönmeli; `body`'ye düşerse klavye kullanıcısı kenar çubuğunun
// başına geri yürümek zorunda kalıyor. Pencere AxetCodeHome'daki gibi
// komutla açılıyor (store'daki `openProjectDialog`).

import { useEffect, useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import ChatSidebar from "../src/components/ChatSidebar";
import ChatProjectDialog from "../src/components/ChatProjectDialog";
import { ChatStoreProvider, useChatStore, type ChatStore } from "../src/stores/chatStore";

let store: ChatStore;

function Harness() {
  store = useChatStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const { registerChatCommands } = store;
  useEffect(
    () =>
      registerChatCommands({
        newSession: vi.fn(),
        requestDelete: vi.fn(),
        openProjectDialog: setOpenId,
        openShortcuts: vi.fn()
      }),
    [registerChatCommands]
  );
  const project = store.projects.find((p) => p.id === openId) ?? null;
  return (
    <>
      <ChatSidebar
        recentEntries={[]}
        connectivity={{}}
        tierOverrides={{}}
        activeSap={null}
        onOpenSapLauncher={() => {}}
        onQuickConnectSap={() => {}}
      />
      <ChatProjectDialog project={project} onClose={() => setOpenId(null)} onSave={() => {}} onDelete={() => {}} />
    </>
  );
}

beforeEach(() => {
  (window as unknown as { api: unknown }).api = new Proxy({}, { get: () => vi.fn().mockResolvedValue(undefined) });
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

function mount() {
  render(
    <LanguageProvider language="tr">
      <ChatStoreProvider pushToast={() => {}}>
        <Harness />
      </ChatStoreProvider>
    </LanguageProvider>
  );
}

describe("ChatProjectDialog — İptal sonrası odak", () => {
  it("Yeni proje ile açılıp İptal'le kapanınca odak Yeni proje düğmesinde", () => {
    mount();
    const opener = screen.getByTitle("Yeni proje");
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("Proje ayarları ile açılıp İptal'le kapanınca odak o düğmede", () => {
    mount();
    act(() => {
      store.createProject();
    });
    const opener = screen.getByTitle("Proje ayarları");
    opener.focus();
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    expect(document.activeElement).toBe(opener);
  });
});
