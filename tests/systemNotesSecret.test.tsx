// @vitest-environment jsdom
// Sistem notundaki sifre gorunumde maskeli, "Goster" ile acilir, kaydederken
// uyari cikar; veri degismez (kararlilik-2). Ornek degerler uydurmadir.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import SystemNotes from "../src/components/SystemNotes";
import type { SystemCommentState } from "../src/components/useSystemComment";

afterEach(cleanup);

function noteState(comment: string, over: Partial<SystemCommentState> = {}): SystemCommentState {
  return {
    comment,
    setComment: vi.fn(),
    commentSource: "saved",
    commentLoading: false,
    commentSaving: false,
    commentSaved: false,
    isDirty: false,
    save: vi.fn(() => Promise.resolve()),
    textareaRef: createRef<HTMLTextAreaElement>(),
    ...over
  } as unknown as SystemCommentState;
}

function renderNotes(note: SystemCommentState, username = "") {
  return render(
    <LanguageProvider language="tr">
      <SystemNotes note={note} username={username} />
    </LanguageProvider>
  );
}

describe("SystemNotes: sifre maskesi", () => {
  it("sifre gorunmez, maskeli metin ve uyari cikar", () => {
    renderNotes(noteState("Şifre: Gizli.123\nnot"));
    const masked = screen.getByTestId("system-note-masked");
    expect(masked.textContent).not.toContain("Gizli.123");
    expect(masked.textContent).toContain("••••");
    expect(screen.getByText(/şifreye benzeyen 1 değer maskelendi/)).toBeTruthy();
    expect((screen.getByLabelText("Yorum / Not") as HTMLTextAreaElement).hidden).toBe(true);
  });

  it("Goster ile asil metin duzenlenebilir hale gelir, Gizle geri maskeler", () => {
    renderNotes(noteState("Şifre: Gizli.123"));
    fireEvent.click(screen.getByRole("button", { name: /Göster/ }));
    const area = screen.getByLabelText("Yorum / Not") as HTMLTextAreaElement;
    expect(area.hidden).toBe(false);
    expect(area.value).toBe("Şifre: Gizli.123");
    fireEvent.click(screen.getByRole("button", { name: /Gizle/ }));
    expect(screen.getByTestId("system-note-masked")).toBeTruthy();
  });

  it("sifresiz notta maske ve uyari yok", () => {
    renderNotes(noteState("Canli sistem, dikkat"));
    expect(screen.queryByTestId("system-note-masked")).toBeNull();
    expect(screen.queryByRole("button", { name: /Göster/ })).toBeNull();
  });

  it("kaydederken veri oldugu gibi kaydedilir ve uyari gosterilir", async () => {
    const note = noteState("Kullanıcı: DEVUSER01\nXy7!kLm2", { isDirty: true });
    const view = renderNotes(note);
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    expect(note.save).toHaveBeenCalledOnce();
    expect(note.setComment).not.toHaveBeenCalled();
    view.rerender(
      <LanguageProvider language="tr">
        <SystemNotes note={{ ...note, isDirty: false, commentSaved: true }} />
      </LanguageProvider>
    );
    expect((await screen.findByRole("alert")).textContent).toMatch(/şifre içeriyor gibi/);
  });
});
