import type { AxetUpdateInfo } from "../../app-electron/shared/types";
import type { TranslationKey } from "../i18n/tr";

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

/**
 * axet-code güncelleme duyurusunun metni.
 *
 * 1.5.1'den önce kurulumu yalnız Intune Company Portal yapıyordu; 1.5.1
 * güncelleme satırına `can_auto_install` ekledi — o zaman axet-code kendini
 * kuruyor ve "Intune'dan güncelleyin" demek yanlış yere yönlendirmek olur.
 * `required`: portal kurulu sürümü artık kabul etmiyor (ölçüm 2026-11-12).
 */
export function axetUpdateNotice(update: AxetUpdateInfo, t: TranslateFn): string {
  const vars = { installed: update.installed, latest: update.latest };
  const body = update.autoInstall
    ? t("axetCodeHome.axetCodeUpdateAuto", vars)
    : update.installed
      ? t("axetCodeHome.axetCodeUpdateVersions", vars)
      : t("axetCodeHome.axetCodeUpdate", { latest: update.latest });
  return update.required ? t("axetCodeHome.axetCodeUpdateRequired") + body : body;
}
