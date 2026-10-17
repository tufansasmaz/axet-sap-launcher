// @vitest-environment jsdom
// İş 3 bileşen testleri: ChatSessionPane rol çipleri.

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { LanguageProvider } from "../src/i18n";
import ChatSessionPane, { type ChatSessionData } from "../src/components/ChatSessionPane";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

// Electron / preload API mock — ChatComposer ve ChatFilesPanel için.
beforeEach(() => {
  const orig = (window as unknown as Record<string, unknown>).api;
  (window as unknown as Record<string, unknown>).api = {
    ...(orig as object),
    listDir: vi.fn().mockResolvedValue([]),
    searchFiles: vi.fn().mockResolvedValue([]),
    watchDir: vi.fn().mockResolvedValue(undefined),
    unwatchDir: vi.fn().mockResolvedValue(undefined),
    onFsChanged: vi.fn().mockReturnValue(() => {})
  };
});

const ROLE_CHIPS = [
  { key: "promptSuggestions.mc1", text: "Bu tablonun alanlarını açıkla: ", needsSap: true },
  { key: "promptSuggestions.mc2", text: "Bu hata mesajı ne anlama geliyor: ", needsSap: true }
];

function makeSession(overrides: Partial<ChatSessionData> = {}): ChatSessionData {
  return {
    id: "__new__",
    messages: [],
    model: null,
    draft: "",
    attachments: [],
    pending: false,
    activity: null,
    activitySteps: [],
    stalledMinutes: 0,
    pendingAsk: null,
    todos: [],
    contextTokens: 0,
    contextLimit: 0,
    editUndo: null,
    queued: null,
    ...overrides
  };
}

function mountPane({
  session = makeSession(),
  roleChips = ROLE_CHIPS,
  hasSapContext = false,
  onRoleChipClick = vi.fn(),
  onSend = vi.fn()
} = {}) {
  render(
    <LanguageProvider language="tr">
      <ChatSessionPane
        session={session}
        active
        models={[]}
        modelsLoading={false}
        modelsError={null}
        attaching={false}
        axetUpdate={null}
        registerTextarea={vi.fn()}
        onDraftChange={vi.fn()}
        onSend={onSend}
        onCancel={vi.fn()}
        onAnswerQuestion={vi.fn()}
        onSelectModel={vi.fn()}
        onRegenerate={vi.fn()}
        onContinue={vi.fn()}
        onEditMessage={vi.fn()}
        onUndoEdit={vi.fn()}
        onUnqueue={vi.fn()}
        onDropQueued={vi.fn()}
        onAttachFiles={vi.fn()}
        onFilesResolved={vi.fn()}
        onRemoveAttachment={vi.fn()}
        suggestionKeys={[]}
        onSuggestionClick={vi.fn()}
        roleChips={roleChips}
        hasSapContext={hasSapContext}
        onRoleChipClick={onRoleChipClick}
      />
    </LanguageProvider>
  );
  return { onRoleChipClick, onSend };
}

// Çip düğmesini `data-role-chip` attribute'u ile bul (metin sondaki boşluk nedeniyle
// testing-library getByText normalizasyon sonrası eşleşmiyor).
function getChipButton(key: string) {
  return document.querySelector(`[data-role-chip="${key}"]`) as HTMLElement;
}

describe("Rol çipleri — boş ekran", () => {
  it("çipler boş ekranda görünür", () => {
    mountPane();
    expect(getChipButton(ROLE_CHIPS[0].key)).toBeTruthy();
  });

  it("çip tıklandığında onRoleChipClick çağrılır", () => {
    const { onRoleChipClick } = mountPane();
    fireEvent.click(getChipButton(ROLE_CHIPS[0].key));
    expect(onRoleChipClick).toHaveBeenCalledWith(ROLE_CHIPS[0].text);
  });

  it("çip tıklaması mesaj göndermez", () => {
    const { onSend } = mountPane();
    fireEvent.click(getChipButton(ROLE_CHIPS[0].key));
    expect(onSend).not.toHaveBeenCalled();
  });

  it("SAP yokken needsSap çipler için ipucu görünür", () => {
    mountPane({ hasSapContext: false });
    expect(screen.getByText("Önce bir SAP sistemine bağlanın")).toBeTruthy();
  });

  it("SAP varken ipucu görünmez", () => {
    mountPane({ hasSapContext: true });
    expect(screen.queryByText("Önce bir SAP sistemine bağlanın")).toBeNull();
  });
});

describe("Rol çipleri — mesajlı sohbet", () => {
  it("sohbette mesaj varsa çipler görünmez", () => {
    mountPane({
      session: makeSession({
        id: "existing",
        messages: [
          { id: "m1", role: "user", content: "Merhaba", createdAt: Date.now(), attachments: [] } as unknown as import("../src/components/ChatBubble").ChatMessage
        ]
      })
    });
    expect(document.querySelector(`[data-role-chip="${ROLE_CHIPS[0].key}"]`)).toBeNull();
  });
});
