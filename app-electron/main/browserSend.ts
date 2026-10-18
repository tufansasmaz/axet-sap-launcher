// "Ajana gönder" (spec 2026-10-18 tarayici §3, §6). Electron'a dokunmuyor:
// sayfa, ajan, dosya ve istem kapıları bağımlılık olarak geliyor; testler
// sahtelerle çağırıyor. Sıra: girdi → alan → ajan uygun mu → sayfa →
// seçili metin → (ekran görüntüsü) → ajan HÂLÂ uygun mu → istem → Enter
// sonucu. Bir adım düşerse hiçbir şey gönderilmiyor (yarım bilgi gitmesin) ve
// bu çağrıda yazılmış ekran görüntüsü geri siliniyor. Tek istisna Enter'ın
// iptali ("notSubmitted"): metin ajanın istem satırında DURUYOR (agentMonitor
// yalnız motor bittiyse satırı temizliyor); kullanıcı onu gönderirse yol
// geçerli kalsın diye görüntü silinmiyor. Gönderilemeyen istem
// yeniden denenmiyor. Günlükte yalnız sonuç ve "ekran görüntüsü var mı" (§4.7).
//
// Eşzamanlı iki gönderim: göndericinin kendi kilidi yok. agentMonitor.sendPrompt
// Enter kesinleşene kadar (promptInFlight) ikinci istemi "busy" ile reddediyor;
// ikinci çağrı yalnız kendi yazdığı görüntüyü siliyor.
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

/**
 * Enter sonucunun (onSettled) en çok bekleneceği süre. agentMonitor Enter'ı
 * 150 ms sonra yazıyor ve onSettled'ı tam bir kez çağırıyor; bu süre yalnız
 * zamanlayıcı hiç çalışmazsa (kapanış) devreye giriyor. O durumda metin
 * istem satırına YAZILMIŞTIR: başarı sayılıyor ve görüntü silinmiyor (ajanın
 * okuyacağı dosyayı silmek, "gönderildi" demekten daha büyük zarar).
 */
export const PROMPT_SETTLE_TIMEOUT_MS = 2_000;

export type PromptOutcome = "sent" | "aborted";

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
  /** agentMonitor.sendPrompt sözleşmesi: "ok" ise onSettled tam bir kez gelir ("sent" | "aborted"). */
  sendPrompt(paneId: string, text: string, onSettled: (outcome: PromptOutcome) => void): AgentPromptResult;
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

/** Eşzamanlı bir adım: fırlatırsa o adımın sebebiyle düşer. */
function step<T>(run: () => T, reason: BrowserSendFailure): T {
  try {
    return run();
  } catch {
    throw new StepFailure(reason);
  }
}

/** Zaman uyumsuz bir adım: eşzamanlı fırlatma, ret ve süre aşımı aynı sebeple düşer. */
function within<T>(start: () => Promise<T>, ms: number, reason: BrowserSendFailure): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new StepFailure(reason)), ms);
    let promise: Promise<T>;
    try {
      promise = Promise.resolve(start());
    } catch {
      clearTimeout(timer);
      reject(new StepFailure(reason));
      return;
    }
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

  /**
   * İstemi yazdırıp Enter'ın sonucunu bekliyor. "aborted": kullanıcı arada yazdı
   * ya da motor kapandı; Enter basılmadı ama metin satıra yazıldı → notSubmitted.
   */
  async function prompt(paneId: string, text: string): Promise<void> {
    let settle: (outcome: PromptOutcome | "timeout") => void = () => {};
    const settled = new Promise<PromptOutcome | "timeout">((resolve) => {
      settle = resolve;
    });
    // onSettled sendPrompt dönmeden (eşzamanlı) de gelebilir; söz ilk değeri tutuyor.
    const sent = step(() => deps.sendPrompt(paneId, text, (outcome) => settle(outcome)), "writeFailed");
    if (sent !== "ok") throw new StepFailure(PROMPT_FAILURE[sent] ?? "writeFailed");
    const timer = setTimeout(() => settle("timeout"), PROMPT_SETTLE_TIMEOUT_MS);
    const outcome = await settled;
    clearTimeout(timer);
    if (outcome === "aborted") throw new StepFailure("notSubmitted");
  }

  return {
    async send(workspaceId, paneId, webContentsId, withScreenshot) {
      if (!isBoardId(workspaceId) || !isBoardId(paneId) || !validWebContentsId(webContentsId) || typeof withScreenshot !== "boolean") {
        return finish({ ok: false, reason: "invalid" }, false);
      }
      const fail = (reason: BrowserSendFailure) => finish({ ok: false, reason }, withScreenshot);

      let root: string | null = null;
      let written: string | null = null;
      try {
        const workspace = step(() => deps.workspace(workspaceId), "noWorkspace");
        if (!workspace) throw new StepFailure("noWorkspace");
        const gate = browserAgentGate(step(() => deps.agent(workspaceId, paneId), "noAgent"));
        if (gate) throw new StepFailure(gate);
        const guest = step(() => deps.guest(webContentsId), "noPage");
        if (!guest) throw new StepFailure("noPage");
        const url = step(() => guest.url(), "noPage");
        const title = step(() => guest.title(), "noPage");
        if (!isBrowserNavAllowed(url)) throw new StepFailure("noPage");
        root = workspace.root;
        if (withScreenshot && !root) throw new StepFailure("noRoot");

        const selection = await within(() => guest.selection(), SELECTION_TIMEOUT_MS, "pageBusy");
        if (withScreenshot && root) {
          const shotRoot = root;
          const png = await within(() => guest.capture(), CAPTURE_TIMEOUT_MS, "captureFailed");
          if (!(png instanceof Uint8Array) || png.byteLength === 0) throw new StepFailure("captureFailed");
          if (png.byteLength > SCREENSHOT_MAX_BYTES) throw new StepFailure("tooLarge");
          const saved = step(() => deps.writeScreenshot(shotRoot, png, new Date(deps.now())), "writeFailed");
          if (!saved.ok) throw new StepFailure(saved.reason);
          written = saved.rel;
        }
        // Seçim ve görüntü sürerken ajan çalışmaya başlamış, soru sormuş ya da kullanıcı yazmaya başlamış olabilir.
        const again = browserAgentGate(step(() => deps.agent(workspaceId, paneId), "noAgent"));
        if (again) throw new StepFailure(again);
        // İstem kurulamazsa sendPrompt'un "invalid"i ile aynı anlam: bu metin gönderilemez.
        const text = step(
          () => buildBrowserPrompt({ title, url, selection: typeof selection === "string" ? selection : "", screenshot: written }),
          "invalid"
        );
        await prompt(paneId, text);
        return finish({ ok: true, screenshot: written }, withScreenshot);
      } catch (err) {
        // notSubmitted: istem metni (görüntünün yoluyla) satırda duruyor; silmek
        // kullanıcı satırı gönderince ajana olmayan bir dosya yolu verirdi.
        const lineHasPrompt = err instanceof StepFailure && err.reason === "notSubmitted";
        if (written && root && !lineHasPrompt) {
          try {
            deps.removeScreenshot(root, written);
          } catch {
            // silinemezse olduğu gibi kalır; gönderme zaten durdu
          }
        }
        // Buraya StepFailure dışında bir şey düşmemeli; düşerse en temkinli sebep.
        return fail(err instanceof StepFailure ? err.reason : "writeFailed");
      }
    }
  };
}
