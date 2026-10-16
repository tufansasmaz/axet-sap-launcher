import { useEffect, useState } from "react";
import type { AdtCapabilities, CapabilityId, CapabilityRow } from "../../app-electron/shared/adtCapabilities";
import { useActiveContext } from "../lib/useActiveContext";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";

// "Ajan bu sistemde" öbeği (2026-10-16). Bir modül danışmanı ajanın "çok
// kısıtlı" olduğunu söyledi; neyin kapalı, neyin arıza olduğunu ayırt
// edemiyordu. Satırlar 8787'nin araç listesinden (ana süreç kuruyor); sunucu
// yoksa ✓ yok. Yalnız BAĞLI olunan sistemde görünüyor ve bağlanınca soruluyor,
// sürekli yoklama yok. Bağlantı bilgileriyle aynı satır düzeni: yeni kart yok.

const LABEL: Record<CapabilityId, TranslationKey> = {
  read: "agentCaps.read",
  tables: "agentCaps.tables",
  dumps: "agentCaps.dumps",
  checks: "agentCaps.checks",
  write: "agentCaps.write",
  run: "agentCaps.run"
};

// Durum jetonları; vurgu rengi (lime) yalnız seçim içindir. "Yok" bir hata
// değil, nötr.
const DOT: Record<CapabilityRow["state"], string> = {
  yes: "bg-[var(--status-success-text)]",
  approval: "bg-[var(--status-warning-text)]",
  no: "bg-slate-500"
};

function stateKey(row: CapabilityRow): TranslationKey {
  if (row.state === "yes") return "agentCaps.yes";
  if (row.state === "approval") return "agentCaps.approval";
  if (row.reason === "role") return "agentCaps.noRole";
  if (row.reason === "tier") return "agentCaps.noTier";
  if (row.reason === "notInEngine") return "agentCaps.noEngine";
  return "agentCaps.no";
}

export default function AgentCapabilities({ systemUuid }: { systemUuid: string }) {
  const t = useT();
  const context = useActiveContext();
  const connected = context.sap?.uuid === systemUuid;
  const connectedAt = connected ? context.sap?.connectedAt : null;
  const [caps, setCaps] = useState<AdtCapabilities | null>(null);

  useEffect(() => {
    setCaps(null);
    if (!connectedAt) return;
    let disposed = false;
    window.api.getAdtCapabilities().then((next) => {
      if (!disposed && next?.systemUuid === systemUuid) setCaps(next);
    });
    return () => {
      disposed = true;
    };
  }, [systemUuid, connectedAt]);

  if (!connected || !caps) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-line-subtle pt-3">
      <h4 className="text-xs font-medium text-slate-300">{t("agentCaps.heading")}</h4>
      {caps.server !== "running" ? (
        <p className="text-xs text-slate-400">{t(caps.server === "down" ? "agentCaps.down" : "agentCaps.unauthorized")}</p>
      ) : (
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-x-8">
          {caps.rows.map((row) => (
            <div
              key={row.id}
              data-capability={row.id}
              className="-mb-px flex min-h-8 min-w-0 items-center gap-3 border-b border-line-subtle py-1.5"
            >
              <dt className="w-40 shrink-0 text-xs text-slate-500">{t(LABEL[row.id])}</dt>
              <dd className="flex min-w-0 flex-1 items-center gap-2 text-xs text-slate-200">
                <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[row.state]}`} />
                <span className="truncate">{t(stateKey(row))}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
