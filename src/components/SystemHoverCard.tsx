import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plug } from "lucide-react";
import type {
  ActiveSapContext,
  ConnectivityState,
  SapService,
  SystemTier,
} from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { btn } from "../ui/buttons";
import StatusDot from "./StatusDot";
import TierBadge from "./TierBadge";

// Sidebar'daki sistem satırının üstüne gelince açılan bilgi kartı.
//
// Yerini aldığı şey bir `title=""` idi — yani tarayıcının kendi ipucu kutusu,
// içinde yalnızca müşteri yolu. Bir sistem satırı hakkında kullanıcının
// gerçekten merak ettiği şey (hangi host, hangi port, router var mı, şu an
// bağlı mıyım) ekranın hiçbir yerinde değildi; tıklayıp bağlanmadan
// öğrenilemiyordu.
//
// KART UYDURMUYOR: her satır `SapService`in gerçek bir alanı. Değeri olmayan
// alan hiç render edilmiyor, "—" ile doldurulmuyor da — boş bir satır, olmayan
// bir bilgiyi varmış gibi gösteren bir satırdan iyidir.

const OPEN_DELAY_MS = 380;
const CLOSE_DELAY_MS = 140;
// 264 -> 340. Karttaki her satır "etiket solda, değer sağda" biçiminde ve
// değerlerin çoğu UZUN: router dizesi, tam host adı, manuel ADT adresi. 264
// pikselde etiket payı düşüldükten sonra değere ~150 piksel kalıyordu, yani
// kartın asıl işini gördüğü alanlar neredeyse her sistemde üç noktayla
// bitiyordu — bilgiyi göstermek için açılan bir kart bilgiyi kesiyordu
// (kullanıcı geri bildirimi, 2026-09-07: *"önizleme dar"*).
const CARD_WIDTH = 340;
const GAP = 10;

interface Props {
  service: SapService;
  path: string[];
  tier: SystemTier | null;
  state: ConnectivityState;
  /** Uygulamanın şu an bağlı olduğu sistem — bu satır o değilse `null` gibi davranılır. */
  activeSap: ActiveSapContext | null;
  onConnect: () => void;
  children: React.ReactNode;
}

/** Etiket + değer satırı. Değer yoksa satır HİÇ çıkmaz (bkz. dosya başı). */
function Row({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-3 py-[3px]">
      <span className="shrink-0 text-[11px] text-slate-500">{label}</span>
      <span className={`min-w-0 truncate text-[11px] text-slate-300 ${mono ? "font-mono" : ""}`} title={value}>
        {value}
      </span>
    </div>
  );
}

export default function SystemHoverCard({
  service,
  path,
  tier,
  state,
  activeSap,
  onConnect,
  children,
}: Props) {
  const t = useT();
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Bağlı olmak ile erişilebilir olmak AYNI ŞEY DEĞİL: `state` ağın o adrese
  // ulaşıp ulaşmadığını söylüyor, bu ise oturumun gerçekten bu sistemde
  // olduğunu. Client/User yalnızca ikincisi doğruyken ANLAMLI — bağlı
  // değilken o alanlar geçmiş bir oturumdan kalma olur ve yanlış bilgi verir,
  // o yüzden hiç render edilmiyorlar (kullanıcı kararı, 2026-09-06).
  const connected = activeSap != null && activeSap.uuid === service.uuid;

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const place = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Kart sidebar'ın SAĞINA açılıyor; sığmazsa soluna kaçıyor. Dikeyde
    // satırla hizalı başlıyor, alt kenardan taşarsa yukarı çekiliyor.
    // Ölçüler `fixed` ile viewport'a göre — `absolute` olsaydı sidebar'ın
    // `overflow`u kartı kırpardı.
    const left =
      r.right + GAP + CARD_WIDTH <= window.innerWidth ? r.right + GAP : Math.max(GAP, r.left - GAP - CARD_WIDTH);
    setPos({ top: r.top, left });
  }, []);

  const open = () => {
    clearTimer();
    // Gecikme kasıtlı: listede gezinirken her satırda bir kart açılması
    // yardım değil gürültü olurdu.
    timerRef.current = window.setTimeout(() => {
      place();
      timerRef.current = null;
    }, OPEN_DELAY_MS);
  };

  const close = () => {
    clearTimer();
    // Kapanış gecikmesi de kasıtlı: kartın içinde bir düğme var, fare
    // satırdan karta geçerken aradaki boşlukta kartı kapatmamalıyız.
    timerRef.current = window.setTimeout(() => {
      setPos(null);
      timerRef.current = null;
    }, CLOSE_DELAY_MS);
  };

  useEffect(() => clearTimer, []);

  // Kart satırla hizalı başlıyor ama alt kenardan taşabiliyor. Bu eskiden
  // yalnızca `maxHeight` ile karşılanıyordu, yani kart KISALTILIYORDU:
  // listenin dibindeki bir sisteme gelince kart ~80 piksele sıkışıp içeriğin
  // yarısını gizliyordu. Şimdi önce çizilip ölçülüyor, sonra sığacak kadar
  // YUKARI çekiliyor — kısaltmak yerine kaydırıyoruz. `maxHeight` yine var
  // ama artık ekranın tamamı kadar; yalnızca ekrandan uzun kartlarda devreye
  // giriyor ve orada gerçek bir kaydırma alanı açıyor.
  //
  // Döngüye girmiyor: `top` bir kez düzeltiliyor, ikinci turda koşul artık
  // sağlanmıyor.
  useLayoutEffect(() => {
    if (!pos) return;
    const el = cardRef.current;
    if (!el) return;
    const limit = window.innerHeight - GAP;
    const bottom = pos.top + el.offsetHeight;
    if (bottom <= limit) return;
    const next = Math.max(GAP, limit - el.offsetHeight);
    if (Math.abs(next - pos.top) > 0.5) setPos({ ...pos, top: next });
  }, [pos]);

  // Kart `fixed`, yani sayfa kayarsa çapasından KOPAR. Açıkken kaydırma veya
  // yeniden boyutlandırma olursa kapatmak, yanlış yerde duran bir kartı
  // göstermekten iyi.
  useEffect(() => {
    if (!pos) return;
    const dismiss = (e: Event) => {
      // ...ama kartın KENDİ içindeki kaydırma bu kurala girmiyor. Dinleyici
      // capture fazında ("scroll" baloncuklanmaz, yakalamanın tek yolu bu) ve
      // kartın içi de oraya düşüyordu: tekerlek ilk tıkırtıda kartı
      // kapattığı için taşan içeriğe ULAŞILAMIYORDU — kart kaydırılabilir
      // görünüp kaydırılamıyordu (kullanıcı geri bildirimi, 2026-09-07).
      if (e.type === "scroll" && e.target instanceof Node && cardRef.current?.contains(e.target)) return;
      clearTimer();
      setPos(null);
    };
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [pos]);

  const address = service.host ?? service.manualAdtUrl ?? null;

  return (
    <div ref={anchorRef} onMouseEnter={open} onMouseLeave={close} onFocus={open} onBlur={close}>
      {children}
      {pos &&
        createPortal(
          <div
            ref={cardRef}
            role="tooltip"
            onMouseEnter={clearTimer}
            onMouseLeave={close}
            style={{ top: pos.top, left: pos.left, width: CARD_WIDTH, maxHeight: `calc(100vh - ${GAP * 2}px)` }}
            className="fixed z-50 overflow-y-auto overscroll-contain rounded-lg border border-line bg-card p-3 shadow-lg shadow-black/30"
          >
            {path.length > 0 && (
              <div className="truncate pb-1 text-[10px] text-slate-500" title={path.join(" / ")}>
                {path.join(" / ")}
              </div>
            )}

            <div className="flex items-center gap-2">
              <StatusDot state={state} />
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-100">{service.name}</span>
              {tier && <TierBadge tier={tier} />}
            </div>

            {address && (
              <div className="truncate pt-0.5 font-mono text-[11px] text-slate-400" title={address}>
                {address}
              </div>
            )}

            {connected && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--status-success-border)] bg-[var(--status-success-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--status-success-text)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-success-text)]" />
                {t("systemCard.connected")}
              </div>
            )}

            <div className="mt-2 border-t border-line-subtle pt-1.5">
              <Row label={t("systemPanel.systemId")} value={service.systemId || null} mono />
              <Row label={t("systemPanel.connectionType")} value={service.type || null} />
              <Row label={t("systemCard.port")} value={service.port != null ? String(service.port) : null} mono />
              <Row label={t("systemPanel.routerLabel")} value={service.routerString} mono />
            </div>

            {connected && activeSap && (
              <div className="mt-1.5 border-t border-line-subtle pt-1.5">
                <Row label={t("systemCard.client")} value={activeSap.client || null} mono />
                <Row label={t("systemCard.user")} value={activeSap.username || null} mono />
              </div>
            )}

            <button onClick={onConnect} className={btn("neutral", "sm", "mt-2.5 w-full")}>
              <Plug size={12} />
              {connected ? t("systemCard.reconnect") : t("systemCard.connect")}
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
