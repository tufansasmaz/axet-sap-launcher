import { ChevronDown, ChevronRight, ListTree, Network, Plug } from "lucide-react";
import { useT } from "../i18n";
import { ActiveLine } from "../shell/SidebarFooter";
import { useScriptCommands, useScriptStore } from "../stores/scriptStore";
import { nodeKey } from "../stores/scriptTypes";
import type { GuiScriptComponentSummary } from "../../app-electron/shared/types";
import { CountBadge, EmptyState, PanelHeader } from "./sapgui/ui";

// Script modunun kenar çubuğu (grafit, spec §5.2): bağlantılar → oturumlar,
// altında seçili oturumun ekran ağacı. Veri `ScriptStore`'da. Köprüye
// dokunan her tıklama `useScriptCommands` üzerinden ekrana gidiyor. Kendi
// durumu yok.
export default function ScriptSidebar() {
  const t = useT();
  const {
    connections,
    sessionsByConn,
    expandedConn,
    activeSession,
    nodesByKey,
    expandedNodes,
    selectedElementId,
    treeVisible
  } = useScriptStore();
  const commands = useScriptCommands();

  // Köprü kapalıyken ya da teşhis ekranı açıkken ağacın gösterecek bir
  // şeyi yok. Eski liste burada dursaydı tıklanabilir görünürdü, ama
  // tıklamanın karşılığı olmazdı.
  if (!treeVisible) {
    return <EmptyState icon={<Plug size={20} />} text={t("sapGuiScripting.bridgeOff")} />;
  }

  const renderTreeNode = (summary: GuiScriptComponentSummary, depth: number) => {
    if (!activeSession) return null;
    const key = nodeKey(activeSession.connIdx, activeSession.sessIdx, summary.id);
    const isExpanded = expandedNodes[key] ?? false;
    const isSelected = selectedElementId === summary.id;
    const state = nodesByKey[key];
    const paddingLeft = depth * 12 + 8;

    return (
      <div key={summary.id || key}>
        <div
          aria-current={isSelected ? "true" : undefined}
          className={`relative flex w-full cursor-pointer items-center gap-1.5 rounded-md py-1 pr-2 text-left ${
            isSelected ? "bg-[var(--accent-glow)] text-slate-100" : "text-slate-300 hover:bg-active/60"
          }`}
          style={{ paddingLeft }}
          onClick={() => commands.selectElement(summary.id)}
        >
          {isSelected && <ActiveLine />}
          {summary.hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                commands.toggleNode(summary.id);
              }}
              className="shrink-0 cursor-pointer text-slate-500 hover:text-slate-200"
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          ) : (
            <span className="w-[12px] shrink-0" />
          )}
          <span className="shrink-0 truncate font-mono text-2xs text-accent-400">
            {(summary.type || t("sapGuiScripting.unknown")).replace(/^Gui/, "")}
          </span>
          <span className="truncate text-2xs">{summary.name || summary.text || summary.id}</span>
        </div>
        {isExpanded && (
          <div>
            {state === "loading" && (
              <div className="py-1 text-2xs text-slate-500" style={{ paddingLeft: paddingLeft + 20 }}>
                {t("sapGuiScripting.treeLoading")}
              </div>
            )}
            {state === "error" && (
              <div className="py-1 text-2xs text-[var(--status-danger-text)]" style={{ paddingLeft: paddingLeft + 20 }}>
                {t("sapGuiScripting.treeError")}
              </div>
            )}
            {state && typeof state !== "string" && state.children.length === 0 && (
              <div className="py-1 text-2xs text-slate-500" style={{ paddingLeft: paddingLeft + 20 }}>
                {t("sapGuiScripting.treeEmpty")}
              </div>
            )}
            {state && typeof state !== "string" && state.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootKey = activeSession ? nodeKey(activeSession.connIdx, activeSession.sessIdx, "") : "";
  const rootState = activeSession ? nodesByKey[rootKey] : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex max-h-[45%] min-h-0 flex-col overflow-hidden">
        <PanelHeader
          icon={<Network size={12} className="text-slate-500" />}
          title={t("sapGuiScripting.connectionsTitle")}
        >
          <CountBadge value={Array.isArray(connections) ? connections.length : 0} />
        </PanelHeader>
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {connections === "loading" && <div className="px-3 py-2 text-2xs text-slate-500">{t("sapGuiScripting.treeLoading")}</div>}
          {(connections === "error" || (Array.isArray(connections) && connections.length === 0)) && (
            <div className="px-3 py-2 text-2xs leading-relaxed text-slate-500">{t("sapGuiScripting.connectionsEmpty")}</div>
          )}
          {Array.isArray(connections) &&
            connections.map((conn) => {
              const isExpanded = expandedConn[conn.index] ?? false;
              const sessions = sessionsByConn[conn.index];
              return (
                <div key={conn.index}>
                  <button
                    onClick={() => commands.toggleConn(conn.index)}
                    className="flex w-full cursor-pointer items-center gap-1.5 px-2.5 py-1.5 text-left text-2xs font-medium text-slate-300 hover:bg-hover"
                  >
                    {isExpanded ? (
                      <ChevronDown size={12} className="shrink-0 text-slate-500" />
                    ) : (
                      <ChevronRight size={12} className="shrink-0 text-slate-500" />
                    )}
                    <span className="truncate">{conn.description || `#${conn.index}`}</span>
                  </button>
                  {isExpanded && (
                    <div>
                      {sessions === "loading" && <div className="px-6 py-1 text-xs text-slate-500">{t("sapGuiScripting.treeLoading")}</div>}
                      {sessions === "error" && <div className="px-6 py-1 text-xs text-slate-500">{t("sapGuiScripting.treeError")}</div>}
                      {Array.isArray(sessions) && sessions.length === 0 && (
                        <div className="px-6 py-1 text-xs text-slate-500">{t("sapGuiScripting.sessionsEmpty")}</div>
                      )}
                      {Array.isArray(sessions) &&
                        sessions.map((session) => {
                          const isActive = activeSession?.connIdx === conn.index && activeSession?.sessIdx === session.index;
                          return (
                            <button
                              key={session.index}
                              onClick={() => commands.selectSession(conn.index, session.index)}
                              aria-current={isActive ? "true" : undefined}
                              // Seçim kenar çubuğunun öteki listeleriyle aynı:
                              // zemin ve soldaki çizgi (spec §6.5). İki satırlık
                              // yükseklik kalıyor; alt satır sistem/istemci/kullanıcı.
                              className={`relative flex w-full cursor-pointer flex-col gap-0.5 rounded-md py-1.5 pl-5 pr-2.5 text-left ${
                                isActive ? "bg-[var(--accent-glow)] text-slate-100" : "text-slate-300 hover:bg-hover"
                              }`}
                            >
                              {isActive && <ActiveLine />}
                              <span className="truncate text-2xs font-medium">
                                {session.info.Transaction || session.info.Program || `Session ${session.index}`}
                              </span>
                              <span className="truncate text-2xs text-slate-500">
                                {[session.info.SystemName, session.info.Client, session.info.User].filter(Boolean).join(" · ")}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-line">
        <PanelHeader icon={<ListTree size={12} className="text-slate-500" />} title={t("sapGuiScripting.treeTitle")} />
        <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
          {!activeSession && <EmptyState icon={<ListTree size={20} />} text={t("sapGuiScripting.selectSession")} />}
          {activeSession && rootState === "loading" && <div className="px-2 py-2 text-2xs text-slate-500">{t("sapGuiScripting.treeLoading")}</div>}
          {activeSession && rootState === "error" && <div className="px-2 py-2 text-2xs text-slate-500">{t("sapGuiScripting.treeError")}</div>}
          {activeSession &&
            rootState &&
            typeof rootState !== "string" &&
            renderTreeNode(
              {
                id: rootState.id,
                type: rootState.type,
                name: rootState.name,
                text: rootState.text,
                hasChildren: rootState.children.length > 0
              },
              0
            )}
        </div>
      </div>
    </div>
  );
}
