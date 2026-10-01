import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import { useT } from "../i18n";
import { DIALOG_CANCEL_BUTTON, DIALOG_CONFIRM_BUTTON, iconBtn } from "./buttons";

// Uygulamadaki bütün pencerelerin ortak iskeleti (spec §6).
//
// Neden tek bileşen: beş pencere Escape'i, odağı ve "Değişiklikleri at?"
// onayını ayrı ayrı yönetiyordu ve her birinde başka bir eksik vardı —
// odak pencerenin dışındayken Escape çalışmıyor, onay kutusunda Escape
// alttaki pencereyi de kapatıyor, Tab pencereden kaçıyordu. Kurallar artık
// burada bir kez yazılı:
//   - Klavyeyi yalnızca EN ÜSTTEKİ pencere dinliyor (katman sırası
//     modal < confirm < critical; eşitlikte en son açılan).
//   - Escape `document`'ta yakalama aşamasında dinleniyor: odak nerede
//     olursa olsun çalışıyor ve eski `onKeyDown` işleyicilerine ulaşmıyor.
//   - `dirty` iken kapatma isteği önce onay açıyor; onay bir üst katmanda
//     ayrı bir `Modal`.
//   - Arka plana tıklamak KAPATMIYOR: yanlışlıkla dışarı tıklayan kullanıcı
//     yazdıklarını kaybetmesin.
//   - `closeDisabled` iken (ör. kayıt sürüyor) hiçbir yoldan kapanmıyor,
//     onay da açılmıyor.

export type ModalLayer = "modal" | "confirm" | "critical";

export type ModalSize = "sm" | "md" | "lg" | "xl";

// Boy ölçeği (spec §1). Pencereler sayı değil ad veriyor: aynı türden iki
// pencere aynı boyda dursun, yeni pencere ölçeğin dışına çıkmasın.
const MODAL_WIDTH: Record<ModalSize, number> = { sm: 420, md: 520, lg: 640, xl: 960 };

const LAYER_RANK: Record<ModalLayer, number> = { modal: 1, confirm: 2, critical: 3 };
const LAYER_CLASS: Record<ModalLayer, string> = {
  modal: "z-modal",
  confirm: "z-confirm",
  critical: "z-critical"
};

// Açık pencerelerin yığını. Modül düzeyinde: pencereler birbirinin
// bileşen ağacında olmak zorunda değil (ör. App'teki bir onay ile
// SettingsModal).
interface StackEntry {
  id: number;
  rank: number;
}
const stack: StackEntry[] = [];
let nextId = 1;

function isTop(id: number): boolean {
  let top: StackEntry | undefined;
  for (const entry of stack) {
    if (!top || entry.rank > top.rank || (entry.rank === top.rank && entry.id > top.id)) top = entry;
  }
  return top?.id === id;
}

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Görünmeyen ya da etkisiz alandaki öğeler Tab sırasına girmiyor: odak
// görünmez bir düğmeye düşerse kullanıcı nerede olduğunu kaybediyor.
const HIDDEN_ANCESTOR = "[hidden], [aria-hidden='true'], [inert], fieldset[disabled]";

function isRendered(el: HTMLElement, root: HTMLElement): boolean {
  for (let node: HTMLElement | null = el; node && node !== root; node = node.parentElement) {
    if (getComputedStyle(node).display === "none") return false;
  }
  return true;
}

function focusables(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      !(el as HTMLButtonElement).disabled &&
      el.tabIndex >= 0 &&
      !el.closest(HIDDEN_ANCESTOR) &&
      isRendered(el, root)
  );
}

interface ModalContextValue {
  requestClose: () => void;
  closeDisabled: boolean;
}
const ModalContext = createContext<ModalContextValue | null>(null);

/** Pencere ayağındaki "İptal". İçinde bulunduğu pencerenin kapatma isteğini
 *  çağırıyor — yani değişiklik varsa önce onay açılıyor. */
export function ModalCancelButton({ label, autoFocus }: { label?: string; autoFocus?: boolean }) {
  const t = useT();
  const ctx = useContext(ModalContext);
  return (
    <button
      type="button"
      onClick={ctx?.requestClose}
      disabled={ctx?.closeDisabled}
      className={DIALOG_CANCEL_BUTTON}
      autoFocus={autoFocus}
    >
      {label ?? t("common.cancel")}
    </button>
  );
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Kaydedilmemiş değişiklik var mı. Doğruysa kapatma isteği önce onay açar. */
  dirty?: boolean;
  /** Doğruysa pencere kapanmıyor: Escape, X ve İptal etkisiz, kirli-çıkış
   *  onayı da açılmıyor. Kayıt sürerken kullanılıyor — kayıt başarısız olursa
   *  hatayı gösterecek pencere yerinde kalmalı. */
  closeDisabled?: boolean;
  /** İlk odak nereye: `"content"` (varsayılan) gövdenin ilk öğesine,
   *  `"dialog"` pencerenin kendisine. Gövdenin ilk öğesi Enter'la bir şey
   *  DEĞİŞTİRİYORSA (Ayarlar'daki dil seçimi gibi) `"dialog"` kullanılmalı. */
  initialFocus?: "content" | "dialog";
  layer?: ModalLayer;
  /** Doğruysa başlıktaki X düğmesi çizilmiyor. Zorunlu seçim pencereleri
   *  için (ör. RoleModal): kullanıcının kapatabileceği izlenimi vermemeli.
   *  Escape yine `onClose`'u çağırıyor; zorunlu pencere onu boş veriyor. */
  hideClose?: boolean;
  /** Pencere boyu: `sm` 420, `md` 520 (varsayılan), `lg` 640, `xl` 960 px.
   *  Dar pencerede ekrandan taşmıyor. `xl` sabit yükseklikte (Ayarlar:
   *  bölüm değişince pencere zıplamasın). */
  size?: ModalSize;
  /** Doğruysa gövde iç boşluksuz ve kaydırmasız bir esnek kap: içerik kendi
   *  sütunlarını ve kaydırma alanlarını kuruyor (Ayarlar'ın bölüm listesi). */
  bare?: boolean;
  /** `"alertdialog"`: kullanıcının karar vermesi gereken uyarı
   *  (ör. "Değişiklikleri at?"). Ekran okuyucu açıklamayı hemen okuyor. */
  role?: "dialog" | "alertdialog";
  /** Açıklama metninin id'si; panelin `aria-describedby`'ı oluyor. */
  describedBy?: string;
  icon?: ReactNode;
  subtitle?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}

export function Modal(props: ModalProps) {
  if (!props.open) return null;
  return createPortal(<ModalPanel {...props} />, document.body);
}

function ModalPanel({
  onClose,
  title,
  dirty = false,
  closeDisabled = false,
  initialFocus = "content",
  layer = "modal",
  hideClose = false,
  size = "md",
  bare = false,
  role = "dialog",
  describedBy,
  icon,
  subtitle,
  footer,
  children
}: ModalProps) {
  const t = useT();
  const titleId = useId();
  const discardDescId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  // İlk çizimdeki odak = pencereyi açan öğe (autoFocus çizimden SONRA çalışıyor).
  const [opener] = useState(() => document.activeElement);
  const [id] = useState(() => nextId++);
  const [confirming, setConfirming] = useState(false);

  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const closeDisabledRef = useRef(closeDisabled);
  closeDisabledRef.current = closeDisabled;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const requestClose = useCallback(() => {
    if (closeDisabledRef.current) return;
    if (dirtyRef.current) setConfirming(true);
    else onCloseRef.current();
  }, []);

  useLayoutEffect(() => {
    const entry: StackEntry = { id, rank: LAYER_RANK[layer] };
    stack.push(entry);
    return () => {
      const index = stack.indexOf(entry);
      if (index >= 0) stack.splice(index, 1);
    };
  }, [id, layer]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isTop(id) || e.isComposing) return;
      if (e.key === "Escape") {
        // Açık bir açılır liste ya da ışık kutusu Escape'in sahibi: önce o
        // kapanmalı. Sahipler dinleyicilerini `document`'ta kabarma
        // aşamasında tutuyor; bu dinleyici yakalama aşamasında ve her zaman
        // ÖNCE çalışıyor, o yüzden `defaultPrevented`'a bakmak işe yaramıyor —
        // sahibin varlığına bakılıyor. Olaya dokunulmuyor ki sahip onu alsın.
        if (document.querySelector("[data-escape-owner]")) return;
        e.preventDefault();
        e.stopPropagation();
        // Basılı tutulan Escape peş peşe pencere kapatmasın.
        if (e.repeat) return;
        requestClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = focusables(panel);
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!(active instanceof HTMLElement) || !panel.contains(active) || active === panel) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [id, requestClose]);

  // İlk odak. StrictMode efektleri iki kez çalıştırıyor ve arada aşağıdaki
  // temizlik odağı açan öğeye geri veriyor; ilk seçilen öğe hatırlanıp
  // ikinci turda ona dönülüyor (yoksa `autoFocus` kaybolurdu).
  const initialFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const remembered = initialFocusRef.current;
    if (remembered && remembered.isConnected && panel.contains(remembered)) {
      remembered.focus();
      return;
    }
    const active = document.activeElement;
    if (active instanceof HTMLElement && panel.contains(active)) {
      initialFocusRef.current = active;
      return;
    }
    const target =
      initialFocus === "dialog"
        ? panel
        : focusables(bodyRef.current)[0] ?? focusables(footerRef.current)[0] ?? panel;
    initialFocusRef.current = target;
    target.focus();
  }, []);

  // Kapanışta odak açan öğeye dönüyor — o öğe hâlâ sayfadaysa.
  useEffect(
    () => () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    },
    [opener]
  );

  return (
    <ModalContext.Provider value={{ requestClose, closeDisabled }}>
      <div
        className={`fixed inset-0 ${LAYER_CLASS[layer]} flex items-center justify-center bg-[var(--overlay-scrim)] p-4 backdrop-blur-sm animate-backdrop-fade-in`}
      >
        <div
          ref={panelRef}
          role={role}
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={describedBy}
          tabIndex={-1}
          className={`animate-modal-pop-in flex ${
            size === "xl" ? "h-[min(80vh,720px)]" : "max-h-[88vh]"
          } flex-col overflow-hidden rounded-xl border border-line bg-card shadow-elev-2 outline-none`}
          style={{ width: MODAL_WIDTH[size], maxWidth: "calc(100vw - 32px)" }}
        >
          <div className="flex items-start gap-3 px-6 pb-3 pt-5">
            {icon && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-control text-accent-400">
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-lg font-semibold leading-tight text-white">
                {title}
              </h2>
              {subtitle && <p className="mt-1 text-sm leading-relaxed text-slate-400">{subtitle}</p>}
            </div>
            {!hideClose && (
              <button
                type="button"
                onClick={requestClose}
                disabled={closeDisabled}
                aria-label={t("common.close")}
                className={iconBtn("ghost", "sm")}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div
            ref={bodyRef}
            className={bare ? "flex min-h-0 flex-1" : "min-h-0 flex-1 overflow-y-auto px-6 py-4"}
          >
            {children}
          </div>
          {footer && (
            <div ref={footerRef} className="flex items-center justify-end gap-2 border-t border-line-subtle px-6 py-4">
              {footer}
            </div>
          )}
        </div>
      </div>
      {confirming && (
        <Modal
          open
          layer={layer === "modal" ? "confirm" : "critical"}
          role="alertdialog"
          describedBy={discardDescId}
          title={t("settingsModal.discardTitle")}
          size="sm"
          icon={<AlertTriangle size={18} className="text-[var(--status-warning-text)]" />}
          onClose={() => setConfirming(false)}
          footer={
            <>
              <ModalCancelButton autoFocus />
              <button
                type="button"
                className={DIALOG_CONFIRM_BUTTON}
                onClick={() => {
                  setConfirming(false);
                  onCloseRef.current();
                }}
              >
                {t("settingsModal.discardConfirm")}
              </button>
            </>
          }
        >
          <p id={discardDescId} className="text-sm text-slate-400">{t("settingsModal.discardMessage")}</p>
        </Modal>
      )}
    </ModalContext.Provider>
  );
}
