// Bellek görünümü (spec 2026-10-18 ajanlar-ux §5). Solda ekibin ajanları ve
// bellekte arama, sağda seçili ajanın kalıcı belleği: görüntüle, düzenle,
// kaydet, değişiklikleri at. Okuma/yazma bellek penceresiyle aynı IPC ve
// mantık (memoryEditor.tsx); başka ajana geçince kirli metin taslak olarak
// saklanıyor ve geri dönünce "geri getirildi" notuyla geliyor.
// Tur 3: bütün ekiplerin ajanları, satırda boyut ve son değişiklik; aramada tüm bellekler.
import { useEffect, useMemo, useRef, useState } from "react";
import { BookPlus, Check, Search } from "lucide-react";
import { useT } from "../i18n";
import { useTerminalStore } from "../stores/terminalStoreContext";
import type { TerminalPane, TerminalWorkspace } from "../stores/terminalTypes";
import { Button } from "../ui/Button";
import { Eyebrow } from "../ui/Eyebrow";
import { PRIMARY_BUTTON, TOOL_BUTTON } from "../ui/buttons";
import { selectedClass } from "../shell/SidebarFooter";
import { PANE_COLOR_VAR } from "../terminal/paneColors";
import { agentName } from "./agentLabels";
import { agentPanes } from "./agentView";
import { requestAddAgent } from "./addAgentBus";
import { MemoryEditorBody, hasMemoryDraft, useMemoryEditor } from "./memoryEditor";
import { formatBytes } from "../lib/formatBytes";

/** Arama sonucu: ajan ve eşleşen satır (en çok bir satır/ajan başına 3). */
export interface MemoryHit {
  paneId: string;
  line: string;
}

const HITS_PER_AGENT = 3;

/** Saf: belleklerde büyük/küçük harf duyarsız arama; satır başına bir sonuç. */
export function searchMemories(contents: Record<string, string>, query: string): MemoryHit[] {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return [];
  const hits: MemoryHit[] = [];
  for (const [paneId, content] of Object.entries(contents)) {
    let n = 0;
    for (const raw of content.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || !line.toLocaleLowerCase().includes(q)) continue;
      hits.push({ paneId, line: line.length > 160 ? `${line.slice(0, 159)}…` : line });
      if (++n >= HITS_PER_AGENT) break;
    }
  }
  return hits;
}

/** Listedeki bir belleğin özeti: boyut (bayt) ve son değişiklik; okunamadıysa `failed`. */
export interface MemoryMeta {
  size: number;
  mtime?: number;
  failed?: boolean;
}

/** Tur 3: "3 dk önce", "dün 14:05", "12.10." — kısa, yerel saat. */
export function memoryAge(mtime: number | undefined, now: number, t: ReturnType<typeof useT>): string {
  if (!mtime) return "";
  const min = Math.floor((now - mtime) / 60_000);
  if (min < 1) return t("memory.ageNow");
  if (min < 60) return t("memory.ageMin", { min });
  const hours = Math.floor(min / 60);
  if (hours < 24) return t("memory.ageHour", { hours });
  return new Date(mtime).toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

const byteSize = (text: string) => new TextEncoder().encode(text).length;

interface Entry {
  workspace: TerminalWorkspace;
  pane: TerminalPane;
}

/**
 * Tur 3: TÜM ekiplerin ajanları (etkin ekip önce, ekip adıyla gruplu). Belleği
 * açık ajanların dosyası açılışta bir kez okunuyor: listede boyut ve son
 * değişiklik, aramada içerik aynı okumadan.
 */
export default function MemoryView({ workspace }: { workspace: TerminalWorkspace }) {
  const t = useT();
  const { state } = useTerminalStore();
  const teams = [workspace, ...state.workspaces.filter((w) => w.id !== workspace.id)];
  const entries: Entry[] = teams.flatMap((w) => agentPanes(w).map((pane) => ({ workspace: w, pane })));
  const focused = entries.find((e) => e.workspace.id === workspace.id && e.pane.id === workspace.focusedPaneId);
  const [selectedId, setSelectedId] = useState<string | null>(focused?.pane.id ?? entries[0]?.pane.id ?? null);
  const selected = entries.find((e) => e.pane.id === selectedId) ?? null;
  const [query, setQuery] = useState("");
  const [contents, setContents] = useState<Record<string, string> | null>(null);
  const [meta, setMeta] = useState<Record<string, MemoryMeta>>({});
  const [savedSeq, setSavedSeq] = useState(0);
  // Düzenleyici sökülünce (başka ajan) taslak işareti listede yenilensin.
  const [, setLeft] = useState(0);
  const now = Date.now();

  // Seçili ajan kapandıysa ilk ajana geç.
  useEffect(() => {
    if (!selected && entries.length > 0) setSelectedId(entries[0].pane.id);
  }, [selected, entries]);

  // Belleği açık ajanların dosyaları: açılışta ve her kayıttan sonra.
  const memoryKeys = entries
    .filter((e) => e.pane.agent?.memory)
    .map((e) => `${e.workspace.id}\u0001${e.pane.id}`)
    .join("|");
  useEffect(() => {
    let alive = true;
    const pairs = memoryKeys ? memoryKeys.split("|").map((k) => k.split("\u0001") as [string, string]) : [];
    void Promise.all(
      pairs.map(([wsId, paneId]) =>
        window.api.memoryRead(wsId, paneId).then(
          (res) => [paneId, res.ok ? { content: res.content, meta: { size: byteSize(res.content), ...(res.mtime ? { mtime: res.mtime } : {}) } } : { content: "", meta: { size: 0, failed: true } }] as const,
          () => [paneId, { content: "", meta: { size: 0, failed: true } }] as const
        )
      )
    ).then((list) => {
      if (!alive) return;
      setContents(Object.fromEntries(list.map(([id, v]) => [id, v.content])));
      setMeta(Object.fromEntries(list.map(([id, v]) => [id, v.meta as MemoryMeta])));
    });
    return () => {
      alive = false;
    };
  }, [memoryKeys, savedSeq]);
  const searching = query.trim().length > 0;
  const hits = useMemo(() => (searching && contents ? searchMemories(contents, query) : []), [searching, contents, query]);

  if (entries.length === 0) {
    return (
      <section aria-label={t("memory.viewTitle")} data-memory-view="" className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-slate-200">{t("memory.emptyTitle")}</p>
        <p className="max-w-sm text-xs text-slate-500">{t("memory.emptyBody")}</p>
        <button type="button" onClick={() => requestAddAgent()} className={PRIMARY_BUTTON}>
          {t("agents.addFirst")}
        </button>
      </section>
    );
  }

  const nameOf = (id: string) => {
    const e = entries.find((x) => x.pane.id === id);
    return e ? agentName(e.pane, t) : "";
  };
  const multiTeam = teams.filter((w) => agentPanes(w).length > 0).length > 1;
  const memoryCount = entries.filter((e) => e.pane.agent?.memory).length;

  return (
    <section aria-label={t("memory.viewTitle")} data-memory-view="" className="flex h-full min-h-0 pl-12">
      <div className="flex w-72 shrink-0 flex-col border-r border-line">
        <div className="flex h-11 shrink-0 flex-col justify-center px-3">
          <Eyebrow count={`${memoryCount}/${entries.length}`}>{t("memory.viewTitle")}</Eyebrow>
          <span className="text-2xs text-slate-500">{t("memory.viewHint")}</span>
        </div>
        <div className="shrink-0 px-2 pb-2">
          <label className="flex items-center gap-1.5 rounded bg-app px-2 py-1 ring-1 ring-line focus-within:ring-accent-500/50">
            <Search size={12} className="shrink-0 text-slate-500" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("memory.search")}
              aria-label={t("memory.searchLabel")}
              className="min-w-0 flex-1 bg-transparent text-xs text-slate-100 outline-none"
            />
          </label>
        </div>
        {searching ? (
          <div role="list" aria-label={t("memory.searchLabel")} className="chat-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            <p className="px-1 pb-1 text-2xs text-slate-500">{contents && hits.length === 0 ? t("memory.noResults") : t("memory.results", { count: hits.length })}</p>
            {hits.map((hit, index) => (
              <div role="listitem" key={`${hit.paneId}-${index}`}>
                <button
                  type="button"
                  data-memory-hit={hit.paneId}
                  onClick={() => setSelectedId(hit.paneId)}
                  className={`flex w-full flex-col gap-0.5 rounded-md px-2 py-1 text-left ${selectedClass(hit.paneId === selectedId)}`}
                >
                  <span className="truncate text-2xs font-medium text-slate-300">{nameOf(hit.paneId)}</span>
                  <span className="line-clamp-2 break-words font-mono text-2xs text-slate-400">{hit.line}</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div role="list" aria-label={t("memory.agents")} className="chat-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            {teams.map((w) => {
              const panes = agentPanes(w);
              if (panes.length === 0) return null;
              return (
                <div key={w.id} role="presentation">
                  {multiTeam && <div className="truncate px-2 pb-0.5 pt-2 text-2xs font-medium text-slate-500">{w.name}</div>}
                  {panes.map((pane) => (
                    <MemoryAgentRow
                      key={pane.id}
                      pane={pane}
                      workspaceId={w.id}
                      meta={meta[pane.id]}
                      now={now}
                      selected={pane.id === selectedId}
                      onSelect={() => setSelectedId(pane.id)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {selected ? (
          selected.pane.agent?.memory ? (
            <MemoryPanel
              key={`${selected.workspace.id}:${selected.pane.id}`}
              workspaceId={selected.workspace.id}
              pane={selected.pane}
              team={multiTeam ? selected.workspace.name : null}
              onSaved={() => setSavedSeq((n) => n + 1)}
              onLeave={() => setLeft((n) => n + 1)}
            />
          ) : (
            <MemoryOff pane={selected.pane} />
          )
        ) : (
          <p className="m-auto text-xs text-slate-500">{t("memory.pickAgent")}</p>
        )}
      </div>
    </section>
  );
}

function MemoryAgentRow({
  pane,
  workspaceId,
  meta,
  now,
  selected,
  onSelect
}: {
  pane: TerminalPane;
  workspaceId: string;
  meta: MemoryMeta | undefined;
  now: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const t = useT();
  const color = PANE_COLOR_VAR[pane.color ?? "gray"];
  const name = agentName(pane, t);
  const draft = hasMemoryDraft(workspaceId, pane.id);
  const right = !pane.agent?.memory
    ? t("memory.off")
    : draft
      ? t("memory.unsaved")
      : meta?.failed
        ? t("memory.unreadable")
        : meta
          ? [formatBytes(meta.size), memoryAge(meta.mtime, now, t)].filter(Boolean).join(" · ")
          : "";
  return (
    <div role="listitem">
      <button
        type="button"
        data-memory-agent={pane.id}
        aria-pressed={selected}
        onClick={onSelect}
        className={`flex h-9 w-full items-center gap-2 rounded-md px-2 text-left ${selectedClass(selected)}`}
      >
        <span className="h-2 w-2 shrink-0 rounded-full border border-line" style={{ background: color ?? "transparent" }} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span title={name} className="truncate text-xs font-medium text-slate-200">
            {name}
          </span>
          {pane.agent?.role && <span className="truncate text-2xs text-slate-500">{pane.agent.role}</span>}
        </span>
        <span data-memory-meta="" className="shrink-0 text-right font-mono text-2xs tabular-nums text-slate-500">
          {right}
        </span>
      </button>
    </div>
  );
}

function MemoryOff({ pane }: { pane: TerminalPane }) {
  const t = useT();
  const { commands } = useTerminalStore();
  return (
    <div className="m-auto flex max-w-sm flex-col items-center gap-3 p-6 text-center">
      <p className="text-sm text-slate-200">{agentName(pane, t)}</p>
      <p className="text-xs text-slate-500">{t("memory.offHint")}</p>
      <button type="button" onClick={() => commands.enablePaneMemory(pane.id)} className={TOOL_BUTTON}>
        <BookPlus size={12} />
        {t("memory.enable")}
      </button>
    </div>
  );
}

function MemoryPanel({
  workspaceId,
  pane,
  team,
  onSaved,
  onLeave
}: {
  workspaceId: string;
  pane: TerminalPane;
  /** Birden çok ekip varken başlıkta ekip adı. */
  team: string | null;
  onSaved: () => void;
  onLeave: () => void;
}) {
  const t = useT();
  const editor = useMemoryEditor(workspaceId, pane.id);
  // Düzenleyicinin söküm temizliğinden (taslak yazımı) SONRA çalışıyor: etki sırası.
  const onLeaveRef = useRef(onLeave);
  onLeaveRef.current = onLeave;
  useEffect(() => () => onLeaveRef.current(), []);
  const [justSaved, setJustSaved] = useState(false);
  const name = agentName(pane, t);
  useEffect(() => {
    if (editor.dirty) setJustSaved(false);
  }, [editor.dirty]);

  const save = async () => {
    if (await editor.save()) {
      setJustSaved(true);
      onSaved();
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-line px-3">
        <span className="min-w-0 truncate text-sm font-medium text-slate-100">{t("memory.title", { name })}</span>
        {team && <span className="shrink-0 truncate text-2xs text-slate-500">{team}</span>}
        {editor.dirty && <span className="shrink-0 text-2xs text-[var(--status-warning-text)]">{t("memory.unsaved")}</span>}
        {!editor.dirty && justSaved && (
          <span role="status" className="flex shrink-0 items-center gap-1 text-2xs text-[var(--status-success-text)]">
            <Check size={11} />
            {t("memory.saved")}
          </span>
        )}
        <span className="flex-1" />
        <button type="button" onClick={editor.discard} disabled={!editor.dirty || editor.saving} className={`${TOOL_BUTTON} disabled:cursor-default disabled:opacity-40`}>
          {t("memory.discard")}
        </button>
        <Button variant="primary" size="sm" onClick={() => void save()} disabled={!editor.dirty || editor.saving || editor.conflict}>
          {editor.saving ? t("memory.saving") : t("common.save")}
        </Button>
      </div>
      <div className="chat-scroll flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
        <p className="mb-2 text-2xs text-slate-500">{t("memory.description")}</p>
        <MemoryEditorBody editor={editor} label={t("memory.title", { name })} autoFocus={false} />
      </div>
    </div>
  );
}
