// Akış olayının gövde metni (FlowSidebar ve Pano ortak; Tur 3).
import type { TranslateFn } from "../i18n";
import type { FlowEvent } from "./flowEvents";

export function flowBody(event: FlowEvent, t: TranslateFn): string {
  switch (event.kind) {
    case "started":
    case "finished":
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
      return event.detail;
  }
}
