import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { useT } from "../../i18n";
import { SETTINGS_SECTIONS, type SettingsSectionId } from "./settingsSections";

interface Props {
  value: SettingsSectionId;
  onChange: (id: SettingsSectionId) => void;
  dirty: ReadonlySet<SettingsSectionId>;
  /** Sekme id'si `${idPrefix}-tab-${id}`; hepsi tek panele (`${idPrefix}-panel`) bağlı. */
  idPrefix: string;
  /** Listenin altında sabit duran soluk metin (sürüm). */
  footer?: ReactNode;
}

// Ayarlar'ın sol sütunu. Dikey sekme listesi: yalnız seçili sekme sekme
// sırasında (roving tabindex), ok tuşları seçimi taşıyor ve uçlarda dönüyor.
export default function SettingsNav({ value, onChange, dirty, idPrefix, footer }: Props) {
  const t = useT();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const move = (e: KeyboardEvent, index: number) => {
    const last = SETTINGS_SECTIONS.length - 1;
    const next =
      e.key === "ArrowDown" ? (index === last ? 0 : index + 1)
      : e.key === "ArrowUp" ? (index === 0 ? last : index - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    const id = SETTINGS_SECTIONS[next].id;
    onChange(id);
    refs.current[id]?.focus();
  };

  return (
    <div className="flex w-[200px] shrink-0 flex-col border-r border-line">
      <div
        role="tablist"
        aria-orientation="vertical"
        aria-label={t("settingsModal.sectionsLabel")}
        className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2"
      >
        {SETTINGS_SECTIONS.map((section, index) => {
          const selected = section.id === value;
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              ref={(el) => {
                refs.current[section.id] = el;
              }}
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${section.id}`}
              aria-selected={selected}
              aria-controls={`${idPrefix}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(section.id)}
              onKeyDown={(e) => move(e, index)}
              // Seçim dili kenar çubuğundakiyle aynı (ChatSidebar oturum satırı).
              className={`flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm transition-colors ${
                selected
                  ? "bg-[var(--accent-glow)] text-slate-100"
                  : "text-slate-400 hover:bg-hover/60 hover:text-slate-300"
              }`}
            >
              <Icon size={15} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">{t(section.titleKey)}</span>
              {dirty.has(section.id) && (
                <span
                  data-dirty-dot
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--status-warning-text)]"
                />
              )}
            </button>
          );
        })}
      </div>
      {footer && <div className="shrink-0 px-4 py-3 text-2xs text-slate-500">{footer}</div>}
    </div>
  );
}
