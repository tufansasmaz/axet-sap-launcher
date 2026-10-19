// Tur 8: axet-code açılış seçiminin ayarları (ana süreç + Ayarlar ekranı ortak).
// Seçenekler ölçümden (.superpowers/olcum/arac-secim/OLCUM.md, axet-code 1.4.1):
// "Choose your development tool" penceresinde aXet.Code (vurgulu) ve Codex.

export type AxetToolChoice = "axet" | "codex";
export const AXET_TOOL_CHOICES: readonly AxetToolChoice[] = ["axet", "codex"];
export const AXET_TOOL_LABEL: Record<AxetToolChoice, string> = { axet: "aXet.Code", codex: "Codex (OpenAI)" };

export interface AxetAutoSetupPrefs {
  tool: AxetToolChoice;
  /** Model penceresinin süzgecine yazılacak metin; boşsa vurgulu (son kullanılan). */
  model: string;
}

export const AXET_AUTO_MODEL_MAX = 60;

/** Süzgece yazılacak model metni: harf/rakam ve ` ._:/()-`; değilse boş (hiç yazılmaz). */
export function normalizeAutoModel(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed.length > AXET_AUTO_MODEL_MAX) return "";
  return /^[A-Za-z0-9 ._:/()-]*$/.test(trimmed) ? trimmed : "";
}

export function normalizeAutoTool(value: unknown): AxetToolChoice {
  return value === "codex" ? "codex" : "axet";
}

/** Ayarlardan izleyicinin tercihleri; otomatik seçim kapalıysa null (eski davranış). */
export function axetAutoSetupPrefs(cfg: { axetAutoSetup?: boolean; axetAutoTool?: unknown; axetAutoModel?: unknown }): AxetAutoSetupPrefs | null {
  if (cfg.axetAutoSetup === false) return null;
  return { tool: normalizeAutoTool(cfg.axetAutoTool), model: normalizeAutoModel(cfg.axetAutoModel) };
}

/** Ana süreç → renderer (`agents:autoSetup`): otomatik seçim bitti, ajan başına bir kez. */
export interface AgentAutoSetupEvent {
  paneId: string;
  ok: boolean;
  /** Başarıda: seçilen araç etiketi ("" = araç penceresi çıkmadı). */
  tool?: string;
  /** Başarıda: axet-code'un yazdığı model adı ya da ayardaki süzgeç ("" = son kullanılan). */
  model?: string;
  /** Başarısızlıkta: hangi pencere. */
  dialog?: "tool" | "model";
}
