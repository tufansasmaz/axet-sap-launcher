// Bizim stilde açılır seçici (Tur 3): yerel <select> yerine. Düğme
// `role="combobox"` (yalnız seçimli combobox kalıbı, ARIA 1.2), açılan liste
// `role="listbox"`, satırlar `role="option"`. Odak düğmede kalıyor; etkin satır
// `aria-activedescendant` ile söyleniyor. Klavye: ↓/↑/Home/End gezer, Enter ya
// da Boşluk seçer, Esc/Tab kapatır; kapalıyken ↓/↑/Enter/Boşluk açar.
// Satır: simge + ad + (varsa) kısa açıklama. Seçili satırda onay işareti;
// vurgu rengi yalnız seçimde (lime yalnız seçim).
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
}

export function Select({
  value,
  options,
  onChange,
  label,
  placeholder,
  className = ""
}: {
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  /** Erişilebilir ad (görünür etiket ayrıca yazılıyorsa da aynı metin). */
  label: string;
  placeholder?: string;
  className?: string;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  // Dışarı tıklayınca kapan.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Etkin satır görünür kalsın (jsdom'da scrollIntoView yok).
  useEffect(() => {
    if (!open) return;
    const el = document.getElementById(`${listId}-${active}`);
    if (el && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "nearest" });
  }, [open, active, listId]);

  const openList = () => {
    if (options.length === 0) return;
    setActive(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openList();
      }
      return;
    }
    const last = options.length - 1;
    if (e.key === "ArrowDown") setActive((i) => Math.min(last, i + 1));
    else if (e.key === "ArrowUp") setActive((i) => Math.max(0, i - 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(last);
    else if (e.key === "Enter" || e.key === " ") choose(active);
    else if (e.key === "Escape") setOpen(false);
    else if (e.key === "Tab") {
      setOpen(false);
      return;
    } else return;
    e.preventDefault();
  };

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className="flex h-8 w-full min-w-0 cursor-pointer items-center gap-2 rounded-md border border-line bg-transparent px-2 text-left text-xs text-slate-200 outline-none transition-colors hover:border-line-strong focus-visible:border-accent-500/60"
      >
        {selected?.icon && <span className="flex shrink-0 text-slate-400">{selected.icon}</span>}
        <span className="min-w-0 flex-1 truncate">
          {selected ? selected.label : <span className="text-slate-500">{placeholder ?? ""}</span>}
          {selected?.description && <span className="ml-1.5 text-2xs text-slate-500">{selected.description}</span>}
        </span>
        <ChevronDown size={13} className={`shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="chat-scroll absolute left-0 right-0 top-full z-dropdown mt-1 max-h-60 overflow-y-auto rounded-md border border-line bg-card p-1 shadow-xl"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={isSelected}
                data-active={index === active ? "" : undefined}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(e) => {
                  // Odak düğmede kalsın.
                  e.preventDefault();
                  choose(index);
                }}
                className={`flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-xs ${index === active ? "bg-hover text-slate-100" : "text-slate-300"}`}
              >
                <span className="mt-0.5 flex w-3.5 shrink-0 justify-center text-slate-400">{option.icon}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{option.label}</span>
                  {option.description && <span className="line-clamp-2 text-2xs text-slate-500">{option.description}</span>}
                </span>
                {isSelected && <Check size={12} className="mt-0.5 shrink-0 text-accent-400" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
