import type { SapService, SystemTier } from "../../app-electron/shared/types";

const PRD_PATTERN = /(^|[^a-z])(prd|prod|production)([^a-z]|$)/i;
const QA_PATTERN = /(^|[^a-z])(qas|qa|test|tst|uat)([^a-z]|$)/i;
const DEV_PATTERN = /(^|[^a-z])(dev|development|sbx|sandbox)([^a-z]|$)/i;

export function guessTier(service: SapService): SystemTier | null {
  const haystack = `${service.name} ${service.systemId}`;
  if (PRD_PATTERN.test(haystack)) return "PRD";
  if (QA_PATTERN.test(haystack)) return "QA";
  if (DEV_PATTERN.test(haystack)) return "DEV";
  return null;
}

export function resolveTier(service: SapService, overrides: Record<string, SystemTier>): SystemTier | null {
  return overrides[service.uuid] ?? guessTier(service);
}
