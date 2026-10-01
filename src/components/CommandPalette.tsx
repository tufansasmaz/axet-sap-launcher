import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { MessageSquare, Search, Server, Zap, type LucideIcon } from "lucide-react";
import { filterPaletteItems, PALETTE_GROUPS, type PaletteGroup, type PaletteItem } from "../lib/commandPalette";
import { useT } from "../i18n";

interface Props {
  open: boolean;
  items: PaletteItem[];
  onClose: () => void;
}

const GROUP_ICON: Record<PaletteGroup, LucideIcon> = {
  action: Zap,
  chat: MessageSquare,
  system: Server
};

// Ctrl+K komut paleti. `Modal` KULLANILMIYOR: o başlık şeridi ve X düğmesi
// çiziyor, palet ise tek bir arama kutusu. Pencere davranışından gereken iki
// şey burada: `aria-modal` (kabuk kısayolları açık pencereyi böyle tanıyıp
// susuyor) ve kapanınca odağın açan öğeye dönmesi.
//
// Klavye listbox deseniyle: odak HEP arama kutusunda kalıyor, seçili satır
// `aria-activedescendant` ile bildiriliyor — oklar satırlar arasında odak
// gezdirseydi yazmaya devam etmek için kutuya geri dönmek gerekirdi.
export default function CommandPalette({ open, items, onClose }: Props) {
  if (!open) return null;
  return createPortal(<PalettePanel items={items} onClose={onClose} />, document.body);
}

function PalettePanel({ items, onClose }: Omit<Props, "open">) {
  const t = useT();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [opener] = useState(() => document.activeElement);

  const results = useMemo(() => filterPaletteItems(items, query), [items, query]);
  const index = results.length === 0 ? -1 : Math.min(selected, results.length - 1);

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [opener]);

  // Seçili satır görünür alanda kalsın (jsdom'da `scrollIntoView` yok).
  useEffect(() => {
    if (index < 0) return;
    const row = listRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    row?.scrollIntoView?.({ block: "nearest" });
  }, [index]);

  const runAt = (at: number) => {
    const item = results[at];
    if (!item) return;
    // Önce kapanıyor: eylem bir pencere açıyorsa (Ayarlar) odak onunla
    // yarışmasın, palet onun üstünde kalmasın.
    onClose();
    item.run();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    // Olay pencereye kabarmıyor: sohbet ekranının Escape'i (süren cevabı
    // iptal) ve Ctrl+↑/↓'si (sohbet değiştir) palet açıkken çalışmamalı.
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      if (results.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setSelected((index + step + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      runAt(index);
    }
  };

  const optionId = (at: number) => `${listId}-${at}`;

  return (
    <div
      className="fixed inset-0 z-modal flex items-start justify-center bg-[var(--overlay-scrim)] p-4 pt-[14vh] animate-backdrop-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("palette.title")}
        className="animate-modal-pop-in flex max-h-[60vh] w-[560px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-xl border border-line bg-card shadow-elev-2"
      >
        <div className="flex shrink-0 items-center gap-2.5 border-b border-line-subtle px-4">
          <Search size={15} className="shrink-0 text-slate-500" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={index >= 0 ? optionId(index) : undefined}
            aria-autocomplete="list"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={t("palette.placeholder")}
            spellCheck={false}
            className="h-12 min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
          />
          <kbd className="shrink-0 rounded border border-line-subtle px-1.5 py-0.5 font-mono text-[10px] text-slate-500">Esc</kbd>
        </div>

        <div ref={listRef} id={listId} role="listbox" aria-label={t("palette.title")} className="chat-scroll min-h-0 flex-1 overflow-y-auto p-1.5">
          {results.length === 0 && <div className="px-3 py-6 text-center text-xs text-slate-500">{t("palette.empty")}</div>}
          {PALETTE_GROUPS.map((group) => {
            const rows = results.map((item, at) => ({ item, at })).filter(({ item }) => item.group === group);
            if (rows.length === 0) return null;
            const Icon = GROUP_ICON[group];
            return (
              <div key={group} role="group" aria-label={t(`palette.group.${group}`)} className="pb-1">
                <div className="px-2.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">
                  {t(`palette.group.${group}`)}
                </div>
                {rows.map(({ item, at }) => (
                  <div
                    key={item.id}
                    id={optionId(at)}
                    role="option"
                    aria-selected={at === index}
                    data-index={at}
                    onMouseMove={() => at !== index && setSelected(at)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => runAt(at)}
                    className={`flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-[13px] ${
                      at === index ? "bg-active text-white" : "text-slate-300"
                    }`}
                  >
                    <Icon size={14} className="shrink-0 text-slate-500" />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.hint && <span className="min-w-0 max-w-[45%] shrink truncate text-xs text-slate-500">{item.hint}</span>}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
