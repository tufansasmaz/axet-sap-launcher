// @vitest-environment jsdom
// Kabuk kısayolları (spec §6.4). Kanca `window`'u dinliyor; olaylar gerçek
// öğelerden kabarcıkla geliyor, böylece "odak nerede" kuralı sınanıyor.
// `fireEvent` olay engellendiyse `false` döndürüyor.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { SidebarMode } from "../src/shell/activity";
import { isTypingTarget, useShellShortcuts, type ShellShortcutOptions } from "../src/shell/useShellShortcuts";

afterEach(cleanup);

beforeEach(() => {
  // Odak bir kare sonra veriliyor; testte kare hemen işlesin.
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    cb(0);
    return 0;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// `withSearch`: arama kutusu henüz çizilmemiş kenar çubuğunu taklit ediyor.
function Harness({ withSearch = true, ...props }: ShellShortcutOptions & { withSearch?: boolean }) {
  useShellShortcuts(props);
  return (
    <div>
      {withSearch && <input aria-label="Ara" data-sidebar-search />}
      <textarea aria-label="Mesaj" />
      <div aria-label="Düzenlenebilir" contentEditable suppressContentEditableWarning />
      <div className="xterm">
        <textarea aria-label="Terminal girdisi" />
      </div>
      <button type="button">Düğme</button>
    </div>
  );
}

function setup(over: Partial<ShellShortcutOptions> = {}) {
  const props: ShellShortcutOptions = {
    listMode: "axetCode",
    sidebarCollapsed: false,
    onModeChange: vi.fn(),
    onExpandSidebar: vi.fn(async () => {}),
    ...over
  };
  const utils = render(<Harness {...props} />);
  return { props, ...utils };
}

const search = () => screen.getByRole("textbox", { name: "Ara" });

describe("Ctrl+1 / 2 / 3 / 4", () => {
  it("sırayla Sohbet, Logon, Script, Terminal", () => {
    const { props } = setup();
    const modes: SidebarMode[] = ["axetCode", "sapLauncher", "sapGuiScripting", "terminal"];
    modes.forEach((mode, i) => {
      expect(fireEvent.keyDown(document.body, { key: String(i + 1), ctrlKey: true })).toBe(false);
      expect(props.onModeChange).toHaveBeenLastCalledWith(mode);
    });
  });

  it("sıradan bir yazı alanında da çalışıyor", () => {
    const { props } = setup();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Mesaj" }), { key: "2", ctrlKey: true });
    expect(props.onModeChange).toHaveBeenCalledWith("sapLauncher");
  });

  it("terminalin içinden gelince dokunulmuyor (Ctrl+4 dahil)", () => {
    const { props } = setup();
    const terminal = screen.getByRole("textbox", { name: "Terminal girdisi" });
    expect(fireEvent.keyDown(terminal, { key: "2", ctrlKey: true })).toBe(true);
    expect(fireEvent.keyDown(terminal, { key: "4", ctrlKey: true })).toBe(true);
    expect(props.onModeChange).not.toHaveBeenCalled();
  });

  it("Shift, Alt ya da başka bir rakamla hiçbir şey olmuyor", () => {
    const { props } = setup();
    fireEvent.keyDown(document.body, { key: "1", ctrlKey: true, shiftKey: true });
    fireEvent.keyDown(document.body, { key: "1", ctrlKey: true, altKey: true });
    fireEvent.keyDown(document.body, { key: "5", ctrlKey: true });
    fireEvent.keyDown(document.body, { key: "1" });
    expect(props.onModeChange).not.toHaveBeenCalled();
  });

  it("bileşen kalkınca dinleyici de kalkıyor", () => {
    const { props, unmount } = setup();
    unmount();
    fireEvent.keyDown(document.body, { key: "1", ctrlKey: true });
    expect(props.onModeChange).not.toHaveBeenCalled();
  });
});

describe("/", () => {
  it("yazı alanı dışındayken arama kutusunu odaklıyor", () => {
    setup({ listMode: "sapLauncher" });
    const button = screen.getByRole("button", { name: "Düğme" });
    button.focus();
    expect(fireEvent.keyDown(button, { key: "/" })).toBe(false);
    expect(document.activeElement).toBe(search());
  });

  it("Türkçe Q'da Shift+7 ile gelen `/` da odaklıyor", () => {
    // Türkçe klavyede `/` Shift+7; Shift'e bakan bir koşul kısayolu bozar.
    setup({ listMode: "sapLauncher" });
    const button = screen.getByRole("button", { name: "Düğme" });
    button.focus();
    expect(fireEvent.keyDown(button, { key: "/", code: "Digit7", shiftKey: true })).toBe(false);
    expect(document.activeElement).toBe(search());
  });

  it("yazı alanlarında ve terminalde karışmıyor", () => {
    setup();
    for (const name of ["Mesaj", "Terminal girdisi", "Ara"]) {
      const field = screen.getByRole("textbox", { name });
      field.focus();
      expect(fireEvent.keyDown(field, { key: "/" })).toBe(true);
      expect(document.activeElement).toBe(field);
    }
    const editable = screen.getByLabelText("Düzenlenebilir");
    expect(fireEvent.keyDown(editable, { key: "/" })).toBe(true);
  });

  it("Script'te ve Terminal'de hiçbir şey olmuyor", () => {
    for (const listMode of ["sapGuiScripting", "terminal"] as const) {
      const { props } = setup({ listMode, sidebarCollapsed: true });
      expect(fireEvent.keyDown(document.body, { key: "/" })).toBe(true);
      expect(props.onExpandSidebar).not.toHaveBeenCalled();
      cleanup();
    }
  });

  it("kenar çubuğu daraltılmışsa önce açıyor, sonra odaklıyor", async () => {
    const { props } = setup({ sidebarCollapsed: true });
    expect(fireEvent.keyDown(document.body, { key: "/" })).toBe(false);
    expect(props.onExpandSidebar).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(document.activeElement).toBe(search()));
  });

  it("kutu açılıştan bir kare sonra çizilse de odaklıyor", async () => {
    // Gerçek yarış: `setConfig` React olayı dışında çalışıyor, çizim ayrı bir
    // göreve kalıyor ve ilk kare kutuyu henüz bulamıyor.
    const frames: FrameRequestCallback[] = [];
    vi.mocked(window.requestAnimationFrame).mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    const flushFrame = () => frames.shift()?.(0);

    const props: ShellShortcutOptions = {
      listMode: "axetCode",
      sidebarCollapsed: true,
      onModeChange: vi.fn(),
      onExpandSidebar: vi.fn(async () => {})
    };
    const { rerender } = render(<Harness {...props} withSearch={false} />);

    expect(fireEvent.keyDown(document.body, { key: "/" })).toBe(false);
    await waitFor(() => expect(frames.length).toBe(1));

    flushFrame();
    expect(frames.length).toBe(1);

    rerender(<Harness {...props} sidebarCollapsed={false} withSearch />);
    flushFrame();
    expect(document.activeElement).toBe(search());
    expect(frames.length).toBe(0);
  });

  it("Ctrl ile basılınca kısayol değil", () => {
    setup();
    expect(fireEvent.keyDown(document.body, { key: "/", ctrlKey: true })).toBe(true);
    expect(document.activeElement).not.toBe(search());
  });
});

describe("Ctrl+F", () => {
  it("Logon'da yazı alanından bile arama kutusunu odaklıyor", () => {
    setup({ listMode: "sapLauncher" });
    const message = screen.getByRole("textbox", { name: "Mesaj" });
    message.focus();
    expect(fireEvent.keyDown(message, { key: "f", ctrlKey: true })).toBe(false);
    expect(document.activeElement).toBe(search());
  });

  it("başka modda yalnızca tarayıcının bul çubuğunu engelliyor", () => {
    setup({ listMode: "axetCode" });
    expect(fireEvent.keyDown(document.body, { key: "F", ctrlKey: true })).toBe(false);
    expect(document.activeElement).not.toBe(search());
  });

  it("Logon'da daraltılmışsa önce açıyor, sonra odaklıyor", async () => {
    const { props } = setup({ listMode: "sapLauncher", sidebarCollapsed: true });
    fireEvent.keyDown(document.body, { key: "f", ctrlKey: true });
    expect(props.onExpandSidebar).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(document.activeElement).toBe(search()));
  });

  it("Terminal'de yalnızca tarayıcının bul çubuğunu engelliyor", () => {
    const { props } = setup({ listMode: "terminal", sidebarCollapsed: true });
    expect(fireEvent.keyDown(document.body, { key: "f", ctrlKey: true })).toBe(false);
    expect(props.onExpandSidebar).not.toHaveBeenCalled();
  });
});

describe("açık bir pencere (aria-modal) varken", () => {
  it("yalnızca Ctrl+F engelleniyor; mod değişmiyor, arama odaklanmıyor", () => {
    const { props } = setup({ listMode: "sapLauncher" });
    render(
      <div aria-modal="true">
        <button type="button">Penceredeki düğme</button>
      </div>
    );
    const inDialog = screen.getByRole("button", { name: "Penceredeki düğme" });
    inDialog.focus();
    expect(fireEvent.keyDown(inDialog, { key: "/" })).toBe(true);
    expect(fireEvent.keyDown(inDialog, { key: "2", ctrlKey: true })).toBe(true);
    expect(fireEvent.keyDown(inDialog, { key: "f", ctrlKey: true })).toBe(false);
    expect(props.onModeChange).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(inDialog);
  });
});

describe("isTypingTarget", () => {
  it("yazı alanlarını ve terminali tanıyor, düğmeyi değil", () => {
    setup();
    expect(isTypingTarget(screen.getByRole("textbox", { name: "Mesaj" }))).toBe(true);
    expect(isTypingTarget(screen.getByRole("textbox", { name: "Terminal girdisi" }))).toBe(true);
    expect(isTypingTarget(screen.getByLabelText("Düzenlenebilir"))).toBe(true);
    expect(isTypingTarget(screen.getByRole("button", { name: "Düğme" }))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
