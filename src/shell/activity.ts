// Uygulamanın hangi ekranda olduğu. Değerler `ActivityBar`'dan aynen
// taşındı (2026-09-29): config'e ya da başka bir yere yazılmıyorlar ama
// `axetFlows` / `axetFlowsLive` o ekranlar geri açılırsa diye duruyor.
export type Activity =
  | "axetCode"
  | "sapLauncher"
  | "axetFlows"
  | "axetFlowsLive"
  | "sapGuiScripting"
  | "terminal"
  | "readiness";

// Kenar çubuğunda listesi olan ekranlar; mod seçicinin sekmeleri bu sırada.
// Terminal sonda: Ctrl+1/2/3 alışkanlığı bozulmasın (terminal spec'i §3.1).
export type SidebarMode = "axetCode" | "sapLauncher" | "sapGuiScripting" | "terminal";

export const SIDEBAR_MODES: SidebarMode[] = ["axetCode", "sapLauncher", "sapGuiScripting", "terminal"];

export function isSidebarMode(activity: Activity): activity is SidebarMode {
  return (SIDEBAR_MODES as Activity[]).includes(activity);
}

// Kenar çubuğunun ortasında hangi modun listesi duruyor. Hazırlık gibi
// listesi olmayan bir ekrandayken son modunki kalıyor (spec §6.2): liste
// boşalıp geri dolmuyor, kullanıcı nereden geldiğini görüyor.
export function listModeOf(activity: Activity, last: SidebarMode): SidebarMode {
  return isSidebarMode(activity) ? activity : last;
}
