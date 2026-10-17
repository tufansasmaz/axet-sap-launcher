// İş C — Klavye kısayolları penceresi (2026-10-17).
// Açılış: Ctrl+/ (useShellShortcuts) + F1 (useShellShortcuts) + komut paleti.
// src/ui/Modal.tsx çerçevesini kullanır — Tab tuzağı, Escape ve odak kuralları
// orada. Gövde: iki sütunlu, gruplara bölünmüş sade liste; tuşlar <kbd>'de.

import { useT } from "../i18n";
import { Modal } from "../ui/Modal";
import { SHORTCUTS, type ShortcutGroup } from "../lib/shortcuts";
import type { TranslationKey } from "../i18n/tr";

const GROUP_KEY: Record<ShortcutGroup, TranslationKey> = {
  nav: "shortcuts.groupNav",
  chat: "shortcuts.groupChat",
  file: "shortcuts.groupFile",
  terminal: "shortcuts.groupTerminal"
};

const GROUP_ORDER: ShortcutGroup[] = ["nav", "chat", "file", "terminal"];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ShortcutsModal({ open, onClose }: Props) {
  const t = useT();

  const byGroup = GROUP_ORDER.map((group) => ({
    group,
    items: SHORTCUTS.filter((s) => s.group === group)
  })).filter((g) => g.items.length > 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("axetCodeHome.shortcutsTitle")}
      size="md"
      initialFocus="dialog"
    >
      <div className="flex flex-col gap-5 pb-1">
        {byGroup.map(({ group, items }) => (
          <section key={group}>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
              {t(GROUP_KEY[group])}
            </h4>
            {/* İki sütunlu liste: her öğe kendi hücresinde, desc+kbd flex-row. */}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              {items.map((s) => (
                <div key={s.keys} className="flex items-center justify-between gap-4">
                  <dt className="text-[12.5px] text-slate-400">{t(s.descKey)}</dt>
                  <dd className="shrink-0">
                    <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[11px] text-slate-300">
                      {s.keys}
                    </kbd>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  );
}
