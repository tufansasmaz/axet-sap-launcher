// @vitest-environment jsdom
// Pano bildirimine tıklama (spec 2026-10-18 gorev-panosu §8): Ajanlar ekranı, o alan, Pano görünümü.
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import BoardOpenListener from "../src/board/BoardOpenListener";
import { TerminalStoreContext, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";

afterEach(cleanup);

describe("BoardOpenListener", () => {
  it("bildirim tıklaması ekranı açıyor, alanı seçiyor ve Pano'ya geçiyor; söküldüğünde dinleyici kalkıyor", () => {
    let open: ((workspaceId: string) => void) | null = null;
    const off = vi.fn();
    (window as unknown as { api: unknown }).api = {
      onBoardOpen: (cb: (workspaceId: string) => void) => {
        open = cb;
        return off;
      }
    };
    const commands = { selectWorkspace: vi.fn(), setWorkspaceView: vi.fn() };
    const store = { state: initialTerminalState, commands, defaultKind: "cmd", defaultCwd: "", agentCwd: "" } as unknown as TerminalStoreValue;
    const onShow = vi.fn();
    const r = render(
      <TerminalStoreContext.Provider value={store}>
        <BoardOpenListener onShow={onShow} />
      </TerminalStoreContext.Provider>
    );
    act(() => open?.("w2"));
    expect(onShow).toHaveBeenCalledTimes(1);
    expect(commands.selectWorkspace).toHaveBeenCalledWith("w2");
    expect(commands.setWorkspaceView).toHaveBeenCalledWith("w2", "board");
    r.unmount();
    expect(off).toHaveBeenCalled();
  });
});
