// Akış olayının gövde metni (FlowSidebar ve Pano ortak; Tur 3).
import type { TranslateFn } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import type { FlowEvent } from "./flowEvents";

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
    case "error":
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
