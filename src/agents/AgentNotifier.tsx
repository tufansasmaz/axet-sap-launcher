// Tur 6: uygulama içi ajan bildirimi. FlowProvider canlı soru/bitti/hata
// olaylarından bildirim kuyruğu çıkarıyor; burada toast'a çevriliyor.
// Tıklayınca Ajanlar ekranı ve o ajanın bölmesi (Akış kartı en altta).
// O ekip zaten görünürken kısa toast, değilse uzun toast + okunmamış rozet.
// Masaüstü bildirimi ana süreçte (index.ts; aynı ayarlar).
// FlowProvider ve TerminalStoreProvider'ın İÇİNDE çizilmeli.
import { useEffect, useRef } from "react";
import { useT } from "../i18n";
import { useTerminalStore } from "../stores/terminalStoreContext";
import type { ToastMsg } from "../components/Toast";
import { useFlow } from "./flowContext";
import { noticePlan, noticeText, noticeTone } from "./agentNotices";

export const NOTICE_SHORT_MS = 2_500;
export const NOTICE_LONG_MS = 7_000;

export type PushToast = (kind: ToastMsg["kind"], text: string, opts?: { onClick?: () => void; duration?: number }) => void;

export default function AgentNotifier({
  enabled,
  agentsVisible,
  pushToast,
  onShow
}: {
  enabled: boolean;
  agentsVisible: boolean;
  pushToast: PushToast;
  onShow: () => void;
}) {
  const t = useT();
  const { state, commands } = useTerminalStore();
  const { notices, dropNotices, addUnread, markRead } = useFlow();
  const ctx = useRef({ enabled, agentsVisible, activeWorkspaceId: state.activeWorkspaceId, pushToast, onShow, commands, t });
  ctx.current = { enabled, agentsVisible, activeWorkspaceId: state.activeWorkspaceId, pushToast, onShow, commands, t };

  useEffect(() => {
    if (notices.length === 0) return;
    const c = ctx.current;
    let unread = 0;
    for (const notice of notices) {
      const plan = noticePlan(notice, { enabled: c.enabled, agentsVisible: c.agentsVisible, activeWorkspaceId: c.activeWorkspaceId });
      if (plan.unread) unread += 1;
      if (!plan.toast) continue;
      c.pushToast(noticeTone(notice.kind), noticeText(notice, c.t), {
        duration: plan.short ? NOTICE_SHORT_MS : NOTICE_LONG_MS,
        onClick: () => {
          ctx.current.onShow();
          ctx.current.commands.revealPane(notice.paneId);
        }
      });
    }
    if (unread) addUnread(unread);
    dropNotices(notices.map((n) => n.key));
  }, [notices, dropNotices, addUnread]);

  // Ajanlar ekranı açılınca okunmuş sayılır.
  useEffect(() => {
    if (agentsVisible) markRead();
  }, [agentsVisible, markRead]);

  return null;
}
