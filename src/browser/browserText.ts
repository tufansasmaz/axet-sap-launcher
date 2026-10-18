// Tarayıcı görünümünün metin anahtarları (spec 2026-10-18 tarayici §2, §6).
import type { AddressFailure, BrowserSendFailure, LoadErrorKind } from "../../app-electron/shared/browserLogic";
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

export const SEND_FAILURE_KEY: Record<BrowserSendFailure, TranslationKey> = {
  invalid: "browser.fail.invalid",
  noWorkspace: "browser.fail.noWorkspace",
  noAgent: "browser.fail.noAgent",
  notRunning: "browser.fail.notRunning",
  busy: "browser.fail.busy",
  asking: "browser.fail.asking",
  typing: "browser.fail.typing",
  noPage: "browser.fail.noPage",
  pageBusy: "browser.fail.pageBusy",
  noRoot: "browser.fail.noRoot",
  captureFailed: "browser.fail.captureFailed",
  tooLarge: "browser.fail.tooLarge",
  writeFailed: "browser.fail.writeFailed"
};
