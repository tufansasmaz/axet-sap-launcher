import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

// Sekmeler (spec §6.2), WAI-ARIA "tabs" kalıbı, otomatik etkinleştirme:
// ok tuşu seçimi ve odağı birlikte taşıyor. Yalnızca seçili sekme Tab
// sırasında (gezici tabindex) — Tab tuşu sekme şeridinden panele atlıyor,
// her sekmede durmuyor.
//
// Bileşen denetimli (controlled): seçili değer çağıranda. `children` seçili
// sekmenin paneli; paneller arasında durum saklamak çağıranın işi.
//
// `value` null olabilir: kenar çubuğunun mod seçicisinde Hazırlık açıkken
// hiçbir mod seçili değil. O zaman ilk sekme Tab sırasına giriyor; yoksa
// şeride klavyeyle hiç ulaşılamazdı. `onChange` `false` dönerse çağıran
// değişikliği reddetmiş demek, odak yerinde kalıyor. `children` verilmezse
// panel çizilmiyor: mod seçicinin "paneli" kenar çubuğunun kendisi.

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
}

export function Tabs<T extends string>({
  label,
  items,
  value,
  onChange,
  children,
  className,
  stretch = false
}: {
  label: string;
  items: TabItem<T>[];
  value: T | null;
  onChange: (value: T) => boolean | void;
  children?: ReactNode;
  className?: string;
  stretch?: boolean;
}) {
  const base = useId();
  const tabId = (v: T) => `${base}-tab-${v}`;
  const panelId = `${base}-panel`;
  const tabRefs = useRef(new Map<T, HTMLButtonElement>());
  const hasPanel = children !== undefined;
  const selectedIndex = items.findIndex((item) => item.value === value);
  const focusIndex = selectedIndex >= 0 ? selectedIndex : 0;

  function selectAt(index: number) {
    const item = items[(index + items.length) % items.length];
    if (onChange(item.value) === false) return;
    tabRefs.current.get(item.value)?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const none = selectedIndex < 0;
    if (e.key === "ArrowRight") selectAt(none ? 0 : selectedIndex + 1);
    else if (e.key === "ArrowLeft") selectAt(none ? items.length - 1 : selectedIndex - 1);
    else if (e.key === "Home") selectAt(0);
    else if (e.key === "End") selectAt(items.length - 1);
    else return;
    e.preventDefault();
  }

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className={`${stretch ? "flex w-full" : "inline-flex"} items-center gap-1 rounded-lg border border-line bg-control p-1`}
      >
        {items.map((item, index) => {
          const selected = item.value === value;
          return (
            <button
              key={item.value}
              ref={(el) => {
                if (el) tabRefs.current.set(item.value, el);
                else tabRefs.current.delete(item.value);
              }}
              type="button"
              role="tab"
              id={tabId(item.value)}
              aria-selected={selected}
              aria-controls={selected && hasPanel ? panelId : undefined}
              tabIndex={index === focusIndex ? 0 : -1}
              onClick={() => onChange(item.value)}
              className={`h-8 rounded-md px-3 text-sm font-medium transition ${stretch ? "min-w-0 flex-1 truncate" : ""} ${
                selected ? "bg-card text-white shadow-elev-1" : "text-slate-400 hover:bg-hover hover:text-slate-100"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {hasPanel && value !== null && (
        <div role="tabpanel" id={panelId} aria-labelledby={tabId(value)} tabIndex={0} className="mt-4 outline-none">
          {children}
        </div>
      )}
    </div>
  );
}
