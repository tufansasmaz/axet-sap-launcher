// Tur 7: ajanın ürettiği yerel adresi ekibin Tarayıcı görünümünde otomatik aç.
// Kaynaklar: (1) ajan bölmesinin terminal çıktısı (ANSI temizlenmiş, tamamlanan
// satırlar; yalnız YEREL adresler), (2) kesin kaynakta son cevap ve aşama hedefi
// (yerel adres açılır, uzak adres yalnız düğmeli Akış kartı). Kurallar
// `localUrls.autoOpenPlan`da; aynı adres ajan oturumu (pty) başına bir kez.
// İlk görülen durum TABAN: yeniden yüklemede eski cevaplar açılmıyor.
// TerminalStoreProvider, AgentStatusProvider ve FlowProvider'ın İÇİNDE çizilmeli.
import { useEffect, useRef } from "react";
import { useT } from "../i18n";
import { useTerminalStore } from "../stores/terminalStoreContext";
import type { TerminalPane, TerminalWorkspace } from "../stores/terminalTypes";
import type { AgentStatus } from "../../app-electron/shared/agentTypes";
import { useAgentStatuses } from "../agents/agentStatusContext";
import { useFlow } from "../agents/flowContext";
import { agentName } from "../agents/agentLabels";
import { workspaceViewOf } from "../stores/terminalReducer";
import { noteSession } from "../agents/manageLogic";
import { requestBrowserOpen } from "./browserAutoOpen";
import { autoOpenPlan, findUrls, isEditableFocus, LineSplitter, OncePerSession, TYPING_WINDOW_MS, type FoundUrl } from "./localUrls";

interface Owner {
  pane: TerminalPane;
  workspace: TerminalWorkspace;
  ptyId: string;
}

function ownersOf(workspaces: readonly TerminalWorkspace[]): Map<string, Owner> {
  const map = new Map<string, Owner>();
  for (const workspace of workspaces) {
    for (const pane of workspace.panes) {
      if (pane.kind !== "agent" || pane.run.state !== "running") continue;
      map.set(pane.run.ptyId, { pane, workspace, ptyId: pane.run.ptyId });
      // Ajan yönetimi tablosunun "açılış" sütunu (bu izleyici hep takılı; ilk görüş anı).
      noteSession(pane.run.ptyId, Date.now());
    }
  }
  return map;
}

export default function LocalUrlWatcher({ enabled }: { enabled: boolean }) {
  const t = useT();
  const { state, commands } = useTerminalStore();
  const { statuses } = useAgentStatuses();
  const { record } = useFlow();
  const once = useRef(new OncePerSession());
  const splitters = useRef(new Map<string, LineSplitter>());
  const lastKeyAt = useRef(0);
  const owners = useRef(new Map<string, Owner>());
  owners.current = ownersOf(state.workspaces);
  const ctx = useRef({ enabled, state, commands, record, t });
  ctx.current = { enabled, state, commands, record, t };

  const handle = useRef((found: FoundUrl, owner: Owner) => {
    const c = ctx.current;
    if (!once.current.first(owner.ptyId, found.url)) return;
    const workspace = c.state.workspaces.find((w) => w.id === owner.workspace.id) ?? owner.workspace;
    const teamVisible = c.state.visible && c.state.activeWorkspaceId === workspace.id;
    const userTyping = isEditableFocus(document.activeElement) && Date.now() - lastKeyAt.current < TYPING_WINDOW_MS;
    const plan = autoOpenPlan(found, {
      enabled: c.enabled,
      teamVisible,
      userTyping,
      browserShown: teamVisible && workspaceViewOf(workspace) === "browser"
    });
    if (plan.open) {
      requestBrowserOpen(workspace.id, found.url, { auto: true, badge: plan.badge });
      c.commands.setWorkspaceBrowserUrl(workspace.id, found.url);
    }
    if (plan.switchView) c.commands.setWorkspaceView(workspace.id, "browser");
    if (plan.card) {
      c.record({
        at: Date.now(),
        workspaceId: workspace.id,
        kind: plan.card === "opened" ? "browser" : "link",
        paneId: owner.pane.id,
        name: agentName(owner.pane, c.t),
        detail: found.url
      });
    }
  });

  // Kullanıcı yazıyor mu: son tuş anı (yakalama evresi; olay engellenmiyor).
  useEffect(() => {
    const onKey = () => {
      lastKeyAt.current = Date.now();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  // (1) Terminal çıktısı: yalnız yerel adresler (uzak bağlantılar — paket, belge — gürültü).
  useEffect(() => {
    const api = typeof window === "undefined" ? undefined : window.api;
    if (!api?.onTerminalData) return;
    return api.onTerminalData((ptyId, data) => {
      const owner = owners.current.get(ptyId);
      if (!owner) {
        splitters.current.delete(ptyId);
        return;
      }
      let splitter = splitters.current.get(ptyId);
      if (!splitter) {
        splitter = new LineSplitter();
        splitters.current.set(ptyId, splitter);
      }
      for (const line of splitter.feed(data)) {
        if (!/https?:\/\//i.test(line)) continue;
        for (const found of findUrls(line)) if (found.local) handle.current(found, owner);
      }
    });
  }, []);

  // (2) Kesin kaynak: cevap ve aşama hedefi değişince.
  const prev = useRef<Record<string, AgentStatus>>({});
  useEffect(() => {
    const before = prev.current;
    prev.current = statuses;
    for (const [paneId, status] of Object.entries(statuses)) {
      const old = before[paneId];
      if (!old || status.source !== "exact") continue;
      const owner = [...owners.current.values()].find((o) => o.pane.id === paneId);
      if (!owner) continue;
      if (status.reply && status.reply !== old.reply) for (const found of findUrls(status.reply)) handle.current(found, owner);
      const target = status.phase?.target;
      if (target && target !== old.phase?.target) for (const found of findUrls(target)) if (found.local) handle.current(found, owner);
    }
  }, [statuses]);

  return null;
}
