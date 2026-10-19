// "Ajan ekle" isteği (spec 2026-10-18 ajanlar-ux §6): kenar çubuğundaki Akış
// ve Bellek görünümünün boş durumları, ekle diyaloğunu açan Ajanlar
// ekranından ayrı ağaçlarda. Aradaki bağ tek bir pencere olayı; dinleyen
// yoksa (Ajanlar ekranı takılı değil) hiçbir şey olmaz.
const EVENT = "ntt:add-agent";

export function requestAddAgent(): void {
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function onAddAgentRequest(handler: () => void): () => void {
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
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
