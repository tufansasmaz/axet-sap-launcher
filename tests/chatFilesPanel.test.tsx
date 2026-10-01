// @vitest-environment jsdom
//
// Sohbetin sağındaki Dosyalar paneli, soldaki kenar çubuğu gibi ana ekranın
// üstünde duran bir kart (kullanıcı isteği, 2026-10-01): yumuşak köşe, ince
// kenar, keskin `border-l` çizgisi yok.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ChatFilesPanel from "../src/components/ChatFilesPanel";
import { LanguageProvider } from "../src/i18n";

afterEach(cleanup);

beforeEach(() => {
  (window as unknown as { api: unknown }).api = {
    getAllowedRoots: vi.fn(() => Promise.resolve([])),
    listDir: vi.fn(() => Promise.resolve({ ok: true, entries: [] })),
    watchDir: vi.fn(() => Promise.resolve()),
    unwatchDir: vi.fn(() => Promise.resolve()),
    onFsChanged: vi.fn(() => () => {})
  };
});

describe("ChatFilesPanel", () => {
  it("yüzen kart: yuvarlak köşe ve kenar, sol çizgi yok", () => {
    render(
      <LanguageProvider language="tr">
        <ChatFilesPanel rootDir="C:\\p" rootLabel="p" onClose={() => {}} active={false} />
      </LanguageProvider>
    );
    const card = screen.getByText("Dosyalar").closest(".flex-col");
    const cls = (card?.className ?? "").split(/\s+/);
    for (const c of ["rounded-2xl", "border", "border-line-subtle"]) expect(cls).toContain(c);
    expect(cls).not.toContain("border-l");
  });
});
