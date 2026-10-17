// @vitest-environment jsdom
// İş 3 bileşen testleri: ChatSessionPane rol çipleri — M9 davranışı.
// M9: SAP bağlamı varsa rol çipleri; yoksa genel kartlar + ipucu satırı.

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
    listDir: vi.fn().mockResolvedValue({ ok: false, error: "ENOENT" }),
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

const SUGGESTION_KEYS = ["axetCodeHome.suggestion1", "axetCodeHome.suggestion2"];

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
  onSend = vi.fn(),
  suggestionKeys = [] as string[]
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
        suggestionKeys={suggestionKeys}
        onSuggestionClick={vi.fn()}
        roleChips={roleChips}
        hasSapContext={hasSapContext}
        onRoleChipClick={onRoleChipClick}
      />
    </LanguageProvider>
  );
  return { onRoleChipClick, onSend };
}

// Çip düğmesini `data-role-chip` attribute'u ile bul.
function getChipButton(key: string) {
  return document.querySelector(`[data-role-chip="${key}"]`) as HTMLElement | null;
}

describe("M9 — SAP bağlamı YOK: genel kartlar + ipucu", () => {
  it("SAP yokken rol çipleri görünmez", () => {
    mountPane({ hasSapContext: false });
    expect(getChipButton(ROLE_CHIPS[0].key)).toBeNull();
  });

  it("SAP yokken genel öneri kartları görünür (suggestionKeys varsa)", () => {
    mountPane({ hasSapContext: false, suggestionKeys: SUGGESTION_KEYS });
    // data-suggestion attribute'u ile kart bul
    const cards = document.querySelectorAll("[data-suggestion]");
    expect(cards.length).toBe(SUGGESTION_KEYS.length);
  });

  it("SAP yokken ve roleChips varsa ipucu satırı görünür", () => {
    mountPane({ hasSapContext: false });
    expect(screen.getByText("SAP önerileri için önce bir sisteme bağlanın")).toBeTruthy();
  });

  it("SAP yokken ve roleChips yoksa ipucu satırı görünmez", () => {
    mountPane({ hasSapContext: false, roleChips: [] });
    expect(screen.queryByText("SAP önerileri için önce bir sisteme bağlanın")).toBeNull();
  });
});

describe("M9 — SAP bağlamı VAR: rol çipleri", () => {
  it("SAP varken çipler görünür", () => {
    mountPane({ hasSapContext: true });
    expect(getChipButton(ROLE_CHIPS[0].key)).toBeTruthy();
  });

  it("SAP varken ipucu satırı görünmez", () => {
    mountPane({ hasSapContext: true });
    expect(screen.queryByText("SAP önerileri için önce bir sisteme bağlanın")).toBeNull();
  });

  it("çip tıklandığında onRoleChipClick çağrılır", () => {
    const { onRoleChipClick } = mountPane({ hasSapContext: true });
    fireEvent.click(getChipButton(ROLE_CHIPS[0].key)!);
    expect(onRoleChipClick).toHaveBeenCalledWith(ROLE_CHIPS[0].text);
  });

  it("çip tıklaması mesaj göndermez", () => {
    const { onSend } = mountPane({ hasSapContext: true });
    fireEvent.click(getChipButton(ROLE_CHIPS[0].key)!);
    expect(onSend).not.toHaveBeenCalled();
  });
});

describe("Rol çipleri — mesajlı sohbet", () => {
  it("sohbette mesaj varsa çipler görünmez (SAP olsa bile)", () => {
    mountPane({
      hasSapContext: true,
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
