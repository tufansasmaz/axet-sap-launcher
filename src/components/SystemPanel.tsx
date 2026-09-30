import { useEffect, useRef } from "react";
import { Cable, Plus } from "lucide-react";
import type { ConnectivityState, SapService, SystemTier } from "../../app-electron/shared/types";
import SystemHeader from "./SystemHeader";
import SystemInfoList from "./SystemInfoList";
import SystemNotes from "./SystemNotes";
import { useSystemComment } from "./useSystemComment";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { resolveTier } from "../lib/tier";
import { useT } from "../i18n";
import { PANEL_TITLE } from "../ui/buttons";

// Sağ panelin kartı. Zemin `bg-app` yalnızca kartların arasında ve çevresinde
// ince bir boşluk olarak görünüyor; eskiden dar sütunun iki yanı boş ve
// simsiyah kalıyordu (kullanıcı, 2026-09-30).
const PANEL_CARD = "flex flex-col gap-3 rounded-xl border border-line bg-card p-5";

interface Selection {
  path: string[];
  service: SapService;
  itemUuid: string;
}

interface Props {
  selection: Selection | null;
  connectivity: Record<string, ConnectivityState>;
  tierOverrides: Record<string, SystemTier>;
  lastConnectedAt: string | null;
  onCheck: (service: SapService) => void;
  onConnect: (selection: Selection) => void;
  onOpenSapLogon: (service: SapService) => void;
  onEditManual: (service: SapService) => void;
  onDeleteManual: (service: SapService) => void;
  onSetTier: (service: SapService, tier: SystemTier | null) => void;
  /** Listede hiç sistem yok: boş durum "Henüz sistem yok" diyor. */
  listEmpty?: boolean;
  /** Boş durumun açıklaması, ör. SAPUILandscape.xml bulunamadı uyarısı. */
  emptyHint?: string;
  /** Verilirse boş durumda "Sistem Ekle" düğmesi çıkıyor. */
  onAddSystem?: () => void;
}

export default function SystemPanel({
  selection,
  connectivity,
  tierOverrides,
  lastConnectedAt,
  onCheck,
  onConnect,
  onOpenSapLogon,
  onEditManual,
  onDeleteManual,
  onSetTier,
  listEmpty,
  emptyHint,
  onAddSystem
}: Props) {
  const t = useT();
  const note = useSystemComment(selection);

  // Seçimde erişim kontrolü — ama 30 sn'lik bir pencereyle. App.tsx zaten
  // açılışta 5 işçilik bir tarama yapıyor; bu efekt onun üstüne biniyordu ve
  // ağaçta sistemler arasında gezinen kullanıcı her tıklamada yeni bir TCP/
  // SAProuter bağlantısı açtırıyordu. Durum bilgisi 30 sn'de bir tazelenirse
  // yeterince güncel; anında sonuç isteyen başlıktaki durum yazısına tıklıyor
  // ve o bu pencereden geçmiyor.
  const lastCheckedRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    if (!selection) return;
    const uuid = selection.service.uuid;
    const last = lastCheckedRef.current.get(uuid) ?? 0;
    if (Date.now() - last < 30_000) return;
    lastCheckedRef.current.set(uuid, Date.now());
    onCheck(selection.service);
  }, [selection?.itemUuid]);

  if (!selection) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={<Cable size={22} />}
          title={t(listEmpty ? "systemPanel.emptyList" : "systemPanel.emptyState")}
          description={emptyHint}
          action={
            onAddSystem && (
              <Button variant="primary" onClick={onAddSystem}>
                <Plus size={14} />
                {t("app.addSystem")}
              </Button>
            )
          }
        />
      </div>
    );
  }

  const { service, path } = selection;
  const state = connectivity[service.uuid] ?? "unknown";
  const tier = resolveTier(service, tierOverrides);
  const explicitTier = tierOverrides[service.uuid] ?? null;

  return (
    <div className="h-full overflow-y-auto">
      <div
        key={selection.itemUuid}
        className="animate-panel-fade-in mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-8 py-8"
      >
        <SystemHeader
          path={path}
          service={service}
          state={state}
          tier={tier}
          lastConnectedAt={lastConnectedAt}
          onCheck={() => onCheck(service)}
          onConnect={() => onConnect(selection)}
          onOpenSapLogon={() => onOpenSapLogon(service)}
          onEditManual={() => onEditManual(service)}
          onDeleteManual={() => onDeleteManual(service)}
        />
        {/* İki sütun, ama eşik pencerenin değil kabın genişliği: kenar
            çubuğu ve dosya sekmeleri alanı daraltıyor. Kap ~980px'in altına
            inince `auto-fit` tek sütuna düşüyor; `min(100%,…)` dar kapta
            yatay taşmayı önlüyor. */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,480px),1fr))] gap-5">
          <section data-panel-card className={PANEL_CARD}>
            <h3 className={PANEL_TITLE}>{t("systemPanel.detailsHeading")}</h3>
            <SystemInfoList
              service={service}
              tier={tier}
              explicitTier={explicitTier}
              onSetTier={(next) => onSetTier(service, next)}
            />
          </section>
          <div data-panel-card className={PANEL_CARD}>
            <SystemNotes note={note} />
          </div>
        </div>
      </div>
    </div>
  );
}
