// Akış olayının gövde metni (FlowSidebar ve Pano ortak; Tur 3).
import type { TranslateFn } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import type { FlowEvent } from "./flowEvents";

export function flowBody(event: FlowEvent, t: TranslateFn): string {
  switch (event.kind) {
    case "started":
    case "finished":
      // Tur 6: tahmini tur ayrı metinle (istem + çıktı kanıtı; cevap terminalde).
      if (event.exact === false) return t(event.kind === "started" ? "flow.startedEstimated" : "flow.finishedEstimated");
      return t(`flow.${event.kind}`);
    case "note":
      return t(`flow.note.${event.detail}` as TranslationKey);
    case "error":
    case "asked":
      return t(`flow.${event.kind}`);
    case "assigned":
    case "verified":
    case "failed":
      return t(`flow.${event.kind}`, { title: event.detail });
    case "checkpoint":
      return t("flow.checkpoint", { label: event.detail });
    case "message":
    case "relay":
    case "learn":
      return event.detail;
  }
}
