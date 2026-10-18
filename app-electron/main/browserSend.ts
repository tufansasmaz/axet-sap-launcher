// "Ajana gönder" (spec 2026-10-18 tarayici §3, §6). Electron'a dokunmuyor:
// sayfa, ajan, dosya ve istem kapıları bağımlılık olarak geliyor; testler
// sahtelerle çağırıyor. Sıra: girdi → alan → ajan uygun mu → sayfa →
// seçili metin → (ekran görüntüsü) → ajan HÂLÂ uygun mu → istem. Bir adım
// düşerse hiçbir şey gönderilmiyor (yarım bilgi gitmesin) ve yazılmış ekran
// görüntüsü geri siliniyor. Gönderilemeyen istem yeniden denenmiyor.
// Günlükte yalnız sonuç ve "ekran görüntüsü var mı" (§4.7).
import type { AgentPromptResult } from "./agentMonitor";
import { isBoardId } from "../shared/boardCommands";
import {
  CAPTURE_TIMEOUT_MS,
  SCREENSHOT_MAX_BYTES,
  SELECTION_TIMEOUT_MS,
  browserAgentGate,
  buildBrowserPrompt,
  isBrowserNavAllowed,
  type BrowserAgentPresence,
  type BrowserSendFailure,
  type BrowserSendResult
} from "../shared/browserLogic";

export interface BrowserGuestPort {
  url(): string;
  title(): string;
  selection(): Promise<string>;
  capture(): Promise<Uint8Array>;
}

export type ScreenshotWrite = { ok: true; rel: string } | { ok: false; reason: "noRoot" | "writeFailed" };

export interface BrowserSenderDeps {
  workspace(id: string): { root: string | null } | null;
  agent(workspaceId: string, paneId: string): BrowserAgentPresence | null;
  guest(webContentsId: number): BrowserGuestPort | null;
  writeScreenshot(root: string, png: Uint8Array, now: Date): ScreenshotWrite;
  removeScreenshot(root: string, rel: string): void;
  sendPrompt(paneId: string, text: string): AgentPromptResult;
  now(): number;
  log(tag: string, fields: Record<string, string | number | boolean>): void;
}

export interface BrowserSender {
  send(workspaceId: unknown, paneId: unknown, webContentsId: unknown, withScreenshot: unknown): Promise<BrowserSendResult>;
}

const PROMPT_FAILURE: Record<Exclude<AgentPromptResult, "ok">, BrowserSendFailure> = {
  noAgent: "noAgent",
  notRunning: "notRunning",
  asking: "asking",
  typing: "typing",
  busy: "busy",
  invalid: "invalid",
  writeFailed: "writeFailed"
};

class StepFailure extends Error {
  constructor(readonly reason: BrowserSendFailure) {
    super(reason);
  }
}

function within<T>(promise: Promise<T>, ms: number, reason: BrowserSendFailure): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new StepFailure(reason)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        reject(new StepFailure(reason));
      }
    );
  });
}

const validWebContentsId = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

export function createBrowserSender(deps: BrowserSenderDeps): BrowserSender {
  const finish = (result: BrowserSendResult, withScreenshot: boolean): BrowserSendResult => {
    try {
      deps.log("tarayici.gonder", { sonuc: result.ok ? "tamam" : result.reason, ekranGoruntusu: withScreenshot });
    } catch {
      // günlük hatası sonucu değiştirmesin
    }
    return result;
  };

  return {
    async send(workspaceId, paneId, webContentsId, withScreenshot) {
      if (!isBoardId(workspaceId) || !isBoardId(paneId) || !validWebContentsId(webContentsId) || typeof withScreenshot !== "boolean") {
        return finish({ ok: false, reason: "invalid" }, false);
      }
      const fail = (reason: BrowserSendFailure) => finish({ ok: false, reason }, withScreenshot);

      const workspace = deps.workspace(workspaceId);
      if (!workspace) return fail("noWorkspace");
      const gate = browserAgentGate(deps.agent(workspaceId, paneId));
      if (gate) return fail(gate);
      const guest = deps.guest(webContentsId);
      if (!guest) return fail("noPage");
      let url: string;
      let title: string;
      try {
        url = guest.url();
        title = guest.title();
      } catch {
        return fail("noPage");
      }
      if (!isBrowserNavAllowed(url)) return fail("noPage");
      const root = workspace.root;
      if (withScreenshot && !root) return fail("noRoot");

      let written: string | null = null;
      try {
        const selection = await within(guest.selection(), SELECTION_TIMEOUT_MS, "pageBusy");
        if (withScreenshot && root) {
          const png = await within(guest.capture(), CAPTURE_TIMEOUT_MS, "captureFailed");
          if (png.byteLength === 0) throw new StepFailure("captureFailed");
          if (png.byteLength > SCREENSHOT_MAX_BYTES) throw new StepFailure("tooLarge");
          const saved = deps.writeScreenshot(root, png, new Date(deps.now()));
          if (!saved.ok) throw new StepFailure(saved.reason);
          written = saved.rel;
        }
        // Seçim ve görüntü sürerken ajan çalışmaya başlamış, soru sormuş ya da kullanıcı yazmaya başlamış olabilir.
        const again = browserAgentGate(deps.agent(workspaceId, paneId));
        if (again) throw new StepFailure(again);
        const text = buildBrowserPrompt({ title, url, selection: typeof selection === "string" ? selection : "", screenshot: written });
        const sent = deps.sendPrompt(paneId, text);
        if (sent !== "ok") throw new StepFailure(PROMPT_FAILURE[sent]);
        return finish({ ok: true, screenshot: written }, withScreenshot);
      } catch (err) {
        if (written && root) {
          try {
            deps.removeScreenshot(root, written);
          } catch {
            // silinemezse olduğu gibi kalır; gönderme zaten durdu
          }
        }
        return fail(err instanceof StepFailure ? err.reason : "writeFailed");
      }
    }
  };
}
