// "Ajan ekle" isteği (spec 2026-10-18 ajanlar-ux §6): kenar çubuğundaki Akış
// ve Bellek görünümünün boş durumları, ekle diyaloğunu açan Ajanlar
// ekranından ayrı ağaçlarda. Aradaki bağ tek bir pencere olayı; dinleyen
// yoksa (Ajanlar ekranı takılı değil) hiçbir şey olmaz.
// Tur 7: `lead` — Akış'taki "Lider ekle" önerisi; pencere Lider rolüyle açılır.
const EVENT = "ntt:add-agent";

export interface AddAgentOptions {
  lead?: boolean;
}

export function requestAddAgent(options: AddAgentOptions = {}): void {
  window.dispatchEvent(new CustomEvent<AddAgentOptions>(EVENT, { detail: options }));
}

export function onAddAgentRequest(handler: (options: AddAgentOptions) => void): () => void {
  const listener = (event: Event) => handler(((event as CustomEvent<AddAgentOptions | null>).detail ?? {}) as AddAgentOptions);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

// Tur 7: Ajan yönetimi ekranındaki "+ Ekip" (şablonlar) — ekip sekmelerinin penceresini açar.
const NEW_TEAM_EVENT = "ntt:new-team";

export function requestNewTeam(): void {
  window.dispatchEvent(new CustomEvent(NEW_TEAM_EVENT));
}

export function onNewTeamRequest(handler: () => void): () => void {
  window.addEventListener(NEW_TEAM_EVENT, handler);
  return () => window.removeEventListener(NEW_TEAM_EVENT, handler);
}
