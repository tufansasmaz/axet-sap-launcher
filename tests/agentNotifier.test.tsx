// @vitest-environment jsdom
// Tur 6: uygulama içi ajan bildirimi — toast, yönlendirme, okunmamış rozet.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import AgentNotifier, { NOTICE_LONG_MS, NOTICE_SHORT_MS } from "../src/agents/AgentNotifier";
import AgentsModeBadge from "../src/agents/AgentsModeBadge";
import Toast, { type ToastMsg } from "../src/components/Toast";
import { AgentStatusContext, type AgentStatusValue } from "../src/agents/agentStatusContext";
import { EMPTY_FLOW, FlowContext, type FlowValue } from "../src/agents/flowContext";
import type { AgentNotice } from "../src/agents/agentNotices";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";

afterEach(cleanup);

const notice = (over: Partial<AgentNotice> = {}): AgentNotice => ({ key: "k1", kind: "finished", workspaceId: "w1", paneId: "a", name: "Ayşe", exact: true, ...over });

function mount(flow: Partial<FlowValue>, props: { enabled?: boolean; agentsVisible?: boolean; activeWorkspaceId?: string } = {}) {
  const commands = { revealPane: vi.fn() } as unknown as TerminalCommands;
  const store = {
    state: { ...initialTerminalState, phase: "ready", workspaces: [], activeWorkspaceId: props.activeWorkspaceId ?? "w1" },
    commands
  } as unknown as TerminalStoreValue;
  const pushToast = vi.fn();
  const onShow = vi.fn();
  const value: FlowValue = { ...EMPTY_FLOW, dropNotices: vi.fn(), addUnread: vi.fn(), markRead: vi.fn(), ...flow };
  const agents: AgentStatusValue = { statuses: {}, engines: [], now: 1, answer: vi.fn() };
  render(
    <LanguageProvider language="tr">
      <TerminalStoreContext.Provider value={store}>
        <AgentStatusContext.Provider value={agents}>
          <FlowContext.Provider value={value}>
            <AgentNotifier enabled={props.enabled ?? true} agentsVisible={props.agentsVisible ?? false} pushToast={pushToast} onShow={onShow} />
            <AgentsModeBadge />
          </FlowContext.Provider>
        </AgentStatusContext.Provider>
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  return { commands, pushToast, onShow, value };
}

describe("AgentNotifier", () => {
  it("başka ekrandayken uzun toast + okunmamış; tıklayınca Ajanlar ve o ajanın bölmesi; bildirim bir kez tüketiliyor", () => {
    const { commands, pushToast, onShow, value } = mount({ notices: [notice()] });
    expect(pushToast).toHaveBeenCalledTimes(1);
    const [kind, text, opts] = pushToast.mock.calls[0];
    expect(kind).toBe("success");
    expect(text).toBe("Ayşe işini bitirdi");
    expect(opts.duration).toBe(NOTICE_LONG_MS);
    expect(value.addUnread).toHaveBeenCalledWith(1);
    expect(value.dropNotices).toHaveBeenCalledWith(["k1"]);
    opts.onClick();
    expect(onShow).toHaveBeenCalled();
    expect(commands.revealPane).toHaveBeenCalledWith("a");
  });

  it("o ekip görünürken kısa toast, okunmamış yok; soru kehribar", () => {
    const { pushToast, value } = mount({ notices: [notice({ kind: "asked" })] }, { agentsVisible: true });
    expect(pushToast.mock.calls[0][0]).toBe("warning");
    expect(pushToast.mock.calls[0][1]).toBe("Ayşe soru soruyor");
    expect(pushToast.mock.calls[0][2].duration).toBe(NOTICE_SHORT_MS);
    expect(value.addUnread).not.toHaveBeenCalled();
    expect(value.markRead).toHaveBeenCalled();
  });

  it("ayar kapalıysa toast da rozet de yok", () => {
    const { pushToast, value } = mount({ notices: [notice({ kind: "error" })] }, { enabled: false });
    expect(pushToast).not.toHaveBeenCalled();
    expect(value.addUnread).not.toHaveBeenCalled();
    expect(value.dropNotices).toHaveBeenCalledWith(["k1"]);
  });

  it("Ajanlar düğmesinde okunmamış sayısı (9+ kırpılır)", () => {
    mount({ unread: 3 });
    expect(document.querySelector("[data-agents-unread]")?.textContent).toBe("3");
    cleanup();
    mount({ unread: 12 });
    expect(document.querySelector("[data-agents-unread]")?.textContent).toBe("9+");
  });
});

describe("Toast — tıklanabilir ajan bildirimi", () => {
  it("tıklayınca eylem çalışıyor ve kapanıyor", () => {
    const onClick = vi.fn();
    const onDismiss = vi.fn();
    const toast: ToastMsg = { id: 1, kind: "warning", text: "Ayşe soru soruyor", count: 1, version: 0, onClick, duration: 2500 };
    render(
      <LanguageProvider language="tr">
        <Toast toast={toast} onDismiss={onDismiss} />
      </LanguageProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: /Ayşe soru soruyor/ }));
    expect(onClick).toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalledWith(1);
  });
});
