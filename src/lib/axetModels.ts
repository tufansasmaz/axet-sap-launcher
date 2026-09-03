import type { AxetModelEntry } from "../../app-electron/shared/types";

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  aws_anthropic: "Anthropic (AWS)",
  anthropic: "Anthropic"
};

export function formatProviderLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider.replace(/_/g, " ");
}

// Model id'leri ham/teknik (örn. "eu.anthropic.claude-sonnet-5",
// "gpt-5.4-2026-03-05") — bu fonksiyon SADECE görsel bir temizlik yapıyor,
// gerçek model id'sini (seçim/persist için kullanılan) hiç değiştirmiyor.
// Bilinen kalıpları (bölge öneki, bedrock sürüm son eki, tarih son eki)
// temizleyip kalanı okunaklı hâle getiriyor; tanımadığı bir kalıpla
// karşılaşırsa ham id'yi olduğu gibi döndürür (asla hata fırlatmaz).
export function formatModelLabel(entry: AxetModelEntry): string {
  let id = entry.model;
  id = id.replace(/^(eu|us|global)\.anthropic\./i, "");
  id = id.replace(/-v\d+:\d+$/i, "");
  id = id.replace(/-\d{4}-\d{2}-\d{2}$/, "");
  id = id.replace(/^claude-/i, "claude ");

  const words = id.split(/[\s_-]+/).filter(Boolean);
  const formatted = words
    .map((word) => {
      if (/^gpt$/i.test(word)) return "GPT";
      if (/^\d/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");

  return formatted || entry.model;
}

export function modelKey(entry: AxetModelEntry): string {
  return `${entry.provider}/${entry.model}`;
}
