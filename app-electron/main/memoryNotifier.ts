// Bellek bildirimcisi (spec 2026-10-18 ajan-bellegi §3, §7). Ana süreçte tek
// örnek; index.ts'te pano turundan ÖNCE çağrılıyor (tickMemoryNotifier):
// aynı turda ikisi de bekliyorsa bellek satırı önce gider, pano izleyicinin
// "busy" cevabıyla sonraki tura kalır.
//
// Kurallar: hiçbir yol hata fırlatmıyor; günlüğe yol, anahtar ya da metin
// yazılmıyor; dosya yalnız yoksa yaratılıyor (deps.ensureFile, "wx");
// anahtar ve kök yalnız config'teki kayıttan (memoryTarget).
import { memoryPromptLine, memoryTarget, type MemoryNotice, type MemoryTarget } from "../shared/memoryLogic";
import {
  noticeBlocked,
  noticeDelivered,
  noticeDue,
  noticeLater,
  noticeMissed,
  noticeRetry,
  noticeSending,
  startNotice,
  type NoticeState
} from "../shared/memoryNotice";
import type { SavedTerminalWorkspace } from "../shared/types";
import type { AgentPresence, AgentPromptResult, LogFields } from "./agentMonitor";
import type { MemoryEnsure } from "./memoryFiles";

export interface MemoryNotifierDeps {
  now(): number;
  agents(): AgentPresence[];
  /** config.json'daki alanlar; turda en çok bir kez çağrılıyor. */
  workspaces(): readonly SavedTerminalWorkspace[];
  ensureFile(root: string, key: string, name: string): MemoryEnsure;
  sendPrompt(paneId: string, text: string, onSettled?: (outcome: "sent" | "aborted") => void): AgentPromptResult;
  log(tag: string, fields: LogFields): void;
}

export interface MemoryNotifier {
  tick(): void;
  notice(paneId: string): MemoryNotice;
  renotify(paneId: string): boolean;
}

export function createMemoryNotifier(deps: MemoryNotifierDeps): MemoryNotifier {
  const byPane = new Map<string, NoticeState>();

  function attempt<T>(fn: () => T, fallback: T): T {
    try {
      return fn();
    } catch {
      return fallback;
    }
  }

  const log = (fields: LogFields) => attempt(() => deps.log("bellek.bildirim", fields), undefined);

  function missed(paneId: string, from: NoticeState): void {
    const next = noticeMissed(from, attempt(() => deps.now(), 0));
    byPane.set(paneId, next);
    if (next.phase === "failed") log({ sonuc: "vazgecildi", deneme: next.attempts });
  }

  function send(paneId: string, state: NoticeState, target: MemoryTarget): void {
    const ensured = attempt(() => deps.ensureFile(target.root, target.key, target.name), "failed" as MemoryEnsure);
    if (ensured === "failed") {
      byPane.set(paneId, noticeBlocked(state));
      log({ sonuc: "dosya", deneme: state.attempts });
      return;
    }
    const sending = noticeSending(state);
    byPane.set(paneId, sending);
    const result = attempt(
      () =>
        deps.sendPrompt(paneId, memoryPromptLine(target.key), (outcome) => {
          // Arada yeniden başlatıldı ya da kapandı: bu sonuç artık o sürecin değil.
          if (byPane.get(paneId) !== sending) return;
          if (outcome === "sent") {
            byPane.set(paneId, noticeDelivered(sending));
            log({ sonuc: "tamam", deneme: sending.attempts + 1 });
          } else {
            missed(paneId, sending);
          }
        }),
      "writeFailed" as AgentPromptResult
    );
    // Reddedildi (busy/typing/asking/notRunning/…): onSettled hiç çağrılmaz.
    if (result !== "ok" && byPane.get(paneId) === sending) missed(paneId, sending);
  }

  function tick(): void {
    const presence = attempt(() => deps.agents(), null);
    if (!presence) return;
    const live = new Set(presence.map((p) => p.reg.paneId));
    for (const paneId of [...byPane.keys()]) if (!live.has(paneId)) byPane.delete(paneId);
    const now = attempt(() => deps.now(), 0);
    let workspaces: readonly SavedTerminalWorkspace[] | null = null;
    for (const p of presence) {
      const paneId = p.reg.paneId;
      const existing = byPane.get(paneId);
      const state = existing && existing.ptyId === p.reg.ptyId ? existing : startNotice(p.reg.ptyId);
      if (state !== existing) byPane.set(paneId, state);
      if (!noticeDue(state, p, now)) continue;
      if (workspaces === null) workspaces = attempt(() => deps.workspaces(), [] as readonly SavedTerminalWorkspace[]);
      const list = workspaces;
      const target = p.reg.workspaceId ? attempt(() => memoryTarget(list, p.reg.workspaceId as string, paneId), null) : null;
      if (!target) {
        byPane.set(paneId, noticeLater(state, now));
        continue;
      }
      attempt(() => send(paneId, state, target), undefined);
    }
  }

  return {
    tick,
    notice(paneId) {
      return byPane.get(paneId)?.phase ?? "none";
    },
    renotify(paneId) {
      const state = byPane.get(paneId);
      const next = state ? noticeRetry(state) : null;
      if (!next) return false;
      byPane.set(paneId, next);
      return true;
    }
  };
}
