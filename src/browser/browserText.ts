// Tarayıcı görünümünün metin anahtarları (spec 2026-10-18 tarayici §2, §6).
import type { AddressFailure, LoadErrorKind } from "../../app-electron/shared/browserLogic";
import type { TranslationKey } from "../i18n/tr";

export const ADDRESS_FAILURE_KEY: Record<AddressFailure, TranslationKey> = {
  empty: "browser.addressScheme",
  scheme: "browser.addressScheme",
  invalid: "browser.addressInvalid",
  tooLong: "browser.addressTooLong"
};

export const LOAD_ERROR_KEY: Record<LoadErrorKind, TranslationKey> = {
  dns: "browser.errorDns",
  connection: "browser.errorConnection",
  certificate: "browser.errorCertificate",
  other: "browser.errorOther"
};
