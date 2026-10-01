import { useMemo } from "react";
import type { ChatProject } from "../../app-electron/shared/types";
import type { Activity } from "../shell/activity";
import type { FlatSystem } from "../lib/landscape";
import type { PaletteItem } from "../lib/commandPalette";
import type { ChatSession } from "../stores/chatTypes";
import { useChatCommands, useChatStore } from "../stores/chatStore";
import { useT } from "../i18n";
import CommandPalette from "./CommandPalette";

export interface PaletteActions {
  setActivity: (activity: Activity) => void;
  newChat: () => void;
  openChat: (id: string) => void;
  selectSystem: (uuid: string) => void;
  openSettings: () => void;
  toggleTheme: () => void;
  toggleLanguage: () => void;
}

type T = ReturnType<typeof useT>;

/**
 * Paletin satırları. Sohbetler en yeniden eskiye; sistemler manzara
 * sırasında ve ipucunda müşteri yolu + SID var, böylece "müşteri s4q" gibi
 * bir arama tutuyor.
 */
export function buildPaletteItems(
  t: T,
  actions: PaletteActions,
  sessions: ChatSession[],
  projects: ChatProject[],
  systems: FlatSystem[]
): PaletteItem[] {
  const goTo = (id: string, label: string, activity: Activity): PaletteItem => ({
    id: `go:${id}`,
    group: "action",
    label: t("palette.goTo", { name: label }),
    run: () => actions.setActivity(activity)
  });
  const items: PaletteItem[] = [
    { id: "new-chat", group: "action", label: t("axetCodeHome.newSession"), run: actions.newChat },
    goTo("chat", t("shell.modeChat"), "axetCode"),
    goTo("logon", t("shell.modeLogon"), "sapLauncher"),
    goTo("terminal", t("shell.modeTerminal"), "terminal"),
    goTo("readiness", t("shell.readiness"), "readiness"),
    { id: "settings", group: "action", label: t("palette.openSettings"), run: actions.openSettings },
    { id: "theme", group: "action", label: t("palette.toggleTheme"), run: actions.toggleTheme },
    { id: "language", group: "action", label: t("palette.toggleLanguage"), run: actions.toggleLanguage }
  ];

  const projectName = new Map(projects.map((p) => [p.id, p.name]));
  for (const session of [...sessions].sort((a, b) => b.updatedAt - a.updatedAt)) {
    items.push({
      id: `chat:${session.id}`,
      group: "chat",
      label: session.title.trim() || t("palette.untitledChat"),
      hint: session.projectId ? projectName.get(session.projectId) : undefined,
      run: () => actions.openChat(session.id)
    });
  }

  for (const { path, service } of systems) {
    items.push({
      id: `system:${service.uuid}`,
      group: "system",
      label: service.name,
      hint: [path.join(" / "), service.systemId].filter(Boolean).join(" · "),
      run: () => actions.selectSystem(service.uuid)
    });
  }
  return items;
}

interface Props {
  open: boolean;
  onClose: () => void;
  systems: FlatSystem[];
  setActivity: (activity: Activity) => void;
  onSelectSystem: (uuid: string) => void;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
}

// App'in `ChatStoreProvider`'ın İÇİNDE çizdiği sarmalayıcı: sohbet listesi ve
// "yeni sohbet" komutu yalnızca orada okunabiliyor.
export default function AppCommandPalette({
  open,
  onClose,
  systems,
  setActivity,
  onSelectSystem,
  onOpenSettings,
  onToggleTheme,
  onToggleLanguage
}: Props) {
  const t = useT();
  const { sessions, projects, setActiveId } = useChatStore();
  const commands = useChatCommands();

  // Kapalıyken hiç kurulmuyor; yüzlerce sistemlik manzarada her render'da
  // dizi kurmanın anlamı yok.
  const items = useMemo(() => {
    if (!open) return [];
    return buildPaletteItems(
      t,
      {
        setActivity,
        newChat: () => {
          setActivity("axetCode");
          commands.newSession();
        },
        openChat: (id) => {
          setActivity("axetCode");
          setActiveId(id);
        },
        selectSystem: (uuid) => {
          setActivity("sapLauncher");
          onSelectSystem(uuid);
        },
        openSettings: onOpenSettings,
        toggleTheme: onToggleTheme,
        toggleLanguage: onToggleLanguage
      },
      sessions,
      projects,
      systems
    );
  }, [open, t, setActivity, commands, setActiveId, onSelectSystem, onOpenSettings, onToggleTheme, onToggleLanguage, sessions, projects, systems]);

  return <CommandPalette open={open} items={items} onClose={onClose} />;
}
