// Tur 7: Tarayıcı'ya dışarıdan "şu adresi aç" istekleri (ajan çıktısındaki
// yerel adres, Akış kartındaki "Tarayıcıda aç"). Küçük bir dış depo: istek
// ekip başına bekletiliyor; BrowserView takılıysa hemen, değilse ilk
// açılışında alıyor. Rozet: görünüm değiştirilmeden açılan adres sayısı;
// kullanıcı Tarayıcı'ya geçince sıfırlanıyor. Diske yazılmıyor.
import { useSyncExternalStore } from "react";
import { readBrowserUrl } from "../../app-electron/shared/browserLogic";

export interface BrowserOpenRequest {
  url: string;
  /** Otomatik açma: bağlantı reddinde kısa yeniden deneme (sunucu ayağa kalkıyor olabilir). */
  auto: boolean;
}

const pending = new Map<string, BrowserOpenRequest>();
const badges = new Map<string, number>();
const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of [...listeners]) fn();
}

export function subscribeBrowserOpen(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** İstek kaydı; geçersiz/gizli parametreli adres süzülür. Son istek kazanır. */
export function requestBrowserOpen(workspaceId: string, url: string, opts: { auto: boolean; badge: boolean }): boolean {
  const safe = readBrowserUrl(url);
  if (!safe) return false;
  pending.set(workspaceId, { url: safe, auto: opts.auto });
  if (opts.badge) badges.set(workspaceId, (badges.get(workspaceId) ?? 0) + 1);
  emit();
  return true;
}

/** Bekleyen isteği alır ve siler (yalnız bir kez yüklensin). */
export function takeBrowserOpen(workspaceId: string): BrowserOpenRequest | null {
  const request = pending.get(workspaceId) ?? null;
  if (request) pending.delete(workspaceId);
  return request;
}

export function browserBadge(workspaceId: string): number {
  return badges.get(workspaceId) ?? 0;
}

export function clearBrowserBadge(workspaceId: string): void {
  if (!badges.has(workspaceId)) return;
  badges.delete(workspaceId);
  emit();
}

export function useBrowserBadge(workspaceId: string): number {
  return useSyncExternalStore(subscribeBrowserOpen, () => browserBadge(workspaceId), () => 0);
}

/** Testler için. */
export function resetBrowserOpen(): void {
  pending.clear();
  badges.clear();
  emit();
}
