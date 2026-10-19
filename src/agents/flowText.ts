// Akış olayının gövde metni (FlowSidebar ve Pano ortak; Tur 3).
import type { TranslateFn } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import type { FlowEvent } from "./flowEvents";
import { parseFlowErrorDetail, type AgentErrorClass, type AgentRetryInfo } from "../../app-electron/shared/agentErrors";

/** Tur 9: kalıcı sınıflarda kullanıcıya ne yapacağı (otomatik deneme yok). */
const HINT: Partial<Record<AgentErrorClass, TranslationKey>> = {
  auth: "agents.errorHint.auth",
  model: "agents.errorHint.model",
  context: "agents.errorHint.context",
  history: "agents.errorHint.history",
  policy: "agents.errorHint.policy"
};

export interface ErrorCard {
  cls: AgentErrorClass;
  attempts: number;
  max: number;
  detail: string;
  hint?: TranslationKey;
}

/** Hata olayının `detail`inden kart; eski biçimde (sınıfsız) null. */
export function errorCard(detail: string): ErrorCard | null {
  const parsed = parseFlowErrorDetail(detail);
  if (!parsed) return null;
  const hint = HINT[parsed.cls];
  return { ...parsed, ...(hint ? { hint } : {}) };
}

/** Geri sayımın kalan saniyesi. */
export function retrySecondsLeft(retry: AgentRetryInfo, now: number): number {
  return Math.max(0, Math.ceil((retry.at - now) / 1000));
}

const AUTO_SETUP = "autoSetup|";

/** Tur 8: otomatik açılış seçiminin "note" ayrıntısı (araç ve model; "|" ayırıcı). */
export function autoSetupDetail(tool: string, model: string): string {
  const clean = (v: string) => v.split("|").join(" ").trim().slice(0, 60);
  return `${AUTO_SETUP}${clean(tool)}|${clean(model)}`;
}

export function flowBody(event: FlowEvent, t: TranslateFn): string {
  switch (event.kind) {
    case "started":
    case "finished":
      // Tur 6: tahmini tur ayrı metinle (istem + çıktı kanıtı; cevap terminalde).
      if (event.exact === false) return t(event.kind === "started" ? "flow.startedEstimated" : "flow.finishedEstimated");
      return t(`flow.${event.kind}`);
    case "note": {
      if (event.detail.startsWith(AUTO_SETUP)) {
        const [tool, model] = event.detail.slice(AUTO_SETUP.length).split("|");
        return t("flow.note.autoSetup", { tool: tool || "—", model: model || t("flow.note.autoSetupLastUsed") });
      }
      return t(`flow.note.${event.detail}` as TranslationKey);
    }
    case "error": {
      const card = errorCard(event.detail);
      if (!card) return t("flow.error");
      const tries = card.attempts > 0 && card.max > 0 ? t("agents.errorTries", { n: card.attempts, max: card.max }) : "";
      return t("flow.errorClass", { cls: t(`agents.errorClass.${card.cls}` as TranslationKey), tries });
    }
    case "asked":
      return t(`flow.${event.kind}`);
    case "assigned":
    case "verified":
    case "failed":
      return t(`flow.${event.kind}`, { title: event.detail });
    case "checkpoint":
      return t("flow.checkpoint", { label: event.detail });
    case "browser":
      return t("flow.browserOpened", { url: event.detail });
    case "link":
      return t("flow.linkFound", { url: event.detail });
    case "message":
    case "relay":
    case "learn":
      return event.detail;
  }
}
