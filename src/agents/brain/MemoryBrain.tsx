// Bellek — ikinci beyin (Tur 5). Bellek görünümünün ana hâli: ekibin
// yapılandırılmış notları (ekip + ajan belleği) bir harita olarak; liste
// görünümü grafın klavye/ekran okuyucu karşılığı; "Dosyalar" eski ajan
// başına markdown belleği (MemoryView, değişmedi). Sağda ayrıntı paneli:
// görüntüle/düzenle, bağlantılar, geri bağlantılar. Arama ve tür/sahip/etiket
// süzgeci haritada eşleşmeyeni soldurur, listede süzer.
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Filter, Plus, Search, X } from "lucide-react";
import { useT } from "../../i18n";
import type { TranslationKey } from "../../i18n/tr";
import {
  buildGraph,
  filterActive,
  filterNotes,
  NOTE_KINDS,
  normalizeTags,
  searchNotes,
  tagCounts,
  TEAM_NODE,
  TEAM_OWNER,
  type GraphNode,
  type MemoryNote,
  type NoteFilter,
  type NoteKind
} from "../../../app-electron/shared/memoryNotes";
import type { TerminalWorkspace } from "../../stores/terminalTypes";
import { Tabs } from "../../ui/Tabs";
import { PRIMARY_BUTTON, TOOL_BUTTON } from "../../ui/buttons";
import { PANE_COLOR_VAR } from "../../terminal/paneColors";
import { agentName } from "../agentLabels";
import { agentPanes } from "../agentView";
import MemoryView from "../MemoryView";
import MemoryGraphView, { KIND_COLOR } from "./MemoryGraphView";
import { KindChip, NoteEditor, NoteView, noteAge, type NoteDraft, type OwnerOption } from "./NoteDetail";
import { useMemoryNotes } from "./useMemoryNotes";

type Mode = "map" | "list" | "files";
type Panel = { kind: "view" } | { kind: "edit" } | { kind: "new"; draft: NoteDraft } | null;

const LABEL_MAX = 28;
const short = (text: string) => (text.length > LABEL_MAX ? `${text.slice(0, LABEL_MAX - 1)}…` : text);

const toggle = <T,>(set: ReadonlySet<T>, value: T): Set<T> => {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
};

export default function MemoryBrain({ workspace }: { workspace: TerminalWorkspace }) {
  const t = useT();
  const { notes, loaded, add, update, remove } = useMemoryNotes(workspace.id);
  const [mode, setMode] = useState<Mode>("map");
  const [query, setQuery] = useState("");
  const [kinds, setKinds] = useState<ReadonlySet<NoteKind>>(new Set());
  const [owners, setOwners] = useState<ReadonlySet<string>>(new Set());
  const [tags, setTags] = useState<ReadonlySet<string>>(new Set());
  const [showFilter, setShowFilter] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);

  const agents = useMemo(() => agentPanes(workspace).map((p) => ({ id: p.id, name: agentName(p, t), color: PANE_COLOR_VAR[p.color ?? "gray"] })), [workspace, t]);
  const ownerOptions: OwnerOption[] = agents.map((a) => ({ id: a.id, name: a.name }));
  const ownerName = (owner: string, fallback?: string) =>
    owner === TEAM_OWNER ? t("brain.teamMemory") : agents.find((a) => a.id === owner)?.name ?? fallback ?? owner;

  const graph = useMemo(() => {
    const g = buildGraph(notes, agents);
    return g;
  }, [notes, agents]);
  const filter: NoteFilter = { query, kinds, owners, tags };
  const active = filterActive(filter);
  const shown = useMemo(() => filterNotes(notes, { query, kinds, owners, tags }), [notes, query, kinds, owners, tags]);
  const hits = useMemo(() => (query.trim() ? searchNotes(shown, query, 8) : []), [shown, query]);

  // Haritada görünür düğümler: süzgeçten geçen notlar + onların sahibi/etiketi.
  const visible = useMemo(() => {
    if (!active) return null;
    const set = new Set<string>();
    for (const n of shown) {
      set.add(`note:${n.id}`);
      set.add(n.owner ? `agent:${n.owner}` : TEAM_NODE);
      for (const tag of n.tags) set.add(`tag:${tag}`);
    }
    return set;
  }, [active, shown]);

  const noteById = useMemo(() => new Map(notes.map((n) => [n.id, n] as const)), [notes]);
  const selectedNote = selected?.startsWith("note:") ? noteById.get(selected.slice(5)) ?? null : null;
  const selectedNode = selected ? graph.nodes.find((n) => n.id === selected) ?? null : null;

  // Seçili not silindiyse panel kapanır.
  useEffect(() => {
    if (selected && !selectedNode) {
      setSelected(null);
      if (panel?.kind !== "new") setPanel(null);
    }
  }, [selected, selectedNode, panel]);

  const counts = useMemo(() => {
    const byOwner = new Map<string, number>();
    for (const n of notes) byOwner.set(n.owner, (byOwner.get(n.owner) ?? 0) + 1);
    return byOwner;
  }, [notes]);
  const tagList = useMemo(() => tagCounts(notes).slice(0, 16), [notes]);

  const open = useCallback((nodeId: string | null) => {
    setSelected(nodeId);
    setPanel(nodeId ? { kind: "view" } : null);
  }, []);
  const openNote = (id: string) => open(`note:${id}`);
  const newNote = (title = "", owner = TEAM_OWNER) => {
    setSelected(null);
    setPanel({ kind: "new", draft: { title, body: "", kind: "not", tags: "", owner } });
  };

  const colorOf = useCallback((node: GraphNode) => {
    // Haritada renk = kimin belleği (lejantla aynı dil); tür listede/ayrıntıda çiple, süzgeçte.
    if (node.type === "note") return node.owner ? agents.find((a) => a.id === node.owner)?.color ?? "rgb(148 163 184)" : "rgb(203 213 225)";
    if (node.type === "agent") return agents.find((a) => a.id === node.ref)?.color ?? "rgb(148 163 184)";
    if (node.type === "team") return "rgb(203 213 225)";
    return "rgb(100 116 139)";
  }, [agents]);
  const labelOf = useCallback((node: GraphNode) => (node.type === "team" ? t("brain.team") : short(node.label)), [t]);
  const ariaOf = useCallback((node: GraphNode) => {
    if (node.type === "note") return t("brain.nodeNote", { kind: t(`brain.kind.${node.kind ?? "not"}` as TranslationKey), title: node.label, links: node.degree });
    if (node.type === "agent") return t("brain.nodeAgent", { name: node.label, count: counts.get(node.ref) ?? 0 });
    if (node.type === "team") return t("brain.nodeTeam", { count: counts.get(TEAM_OWNER) ?? 0 });
    return t("brain.nodeTag", { tag: node.label, count: notes.filter((n) => n.tags.includes(node.ref)).length });
  }, [t, counts, notes]);

  const draftOf = (n: MemoryNote): NoteDraft => ({ title: n.title, body: n.body, kind: n.kind, tags: n.tags.join(", "), owner: n.owner });
  const filterCount = kinds.size + owners.size + tags.size;

  const side = (() => {
    if (panel?.kind === "new") {
      return (
        <NoteEditor
          key="new"
          heading={t("brain.newNote")}
          initial={panel.draft}
          owners={ownerOptions}
          onCancel={() => setPanel(null)}
          onSave={async (d) => {
            const result = await add({
              title: d.title,
              body: d.body,
              kind: d.kind,
              tags: normalizeTags(d.tags),
              owner: d.owner,
              ...(d.owner ? { ownerName: ownerName(d.owner) } : {}),
              source: { type: "user" }
            });
            if (result.ok) {
              setSelected(`note:${result.note.id}`);
              setPanel({ kind: "view" });
            }
            return result;
          }}
        />
      );
    }
    if (!panel || !selectedNode) return null;
    if (selectedNote && panel.kind === "edit") {
      return (
        <NoteEditor
          key={`edit-${selectedNote.id}`}
          heading={t("brain.edit")}
          initial={draftOf(selectedNote)}
          owners={ownerOptions}
          onCancel={() => setPanel({ kind: "view" })}
          onSave={async (d) => {
            const result = await update(
              selectedNote.id,
              { title: d.title, body: d.body, kind: d.kind, tags: normalizeTags(d.tags), owner: d.owner, ...(d.owner ? { ownerName: ownerName(d.owner) } : {}) },
              selectedNote.updated
            );
            if (result.ok) setPanel({ kind: "view" });
            return result;
          }}
        />
      );
    }
    if (selectedNote) {
      return (
        <NoteView
          note={selectedNote}
          notes={notes}
          ownerName={ownerName(selectedNote.owner, selectedNote.ownerName)}
          onOpen={openNote}
          onCreateLinked={(title) => newNote(title, selectedNote.owner)}
          onEdit={() => setPanel({ kind: "edit" })}
          onDelete={async () => {
            const ok = await remove(selectedNote.id);
            if (ok) open(null);
            return ok;
          }}
          onTag={(tag) => setTags(new Set([tag]))}
          onClose={() => open(null)}
        />
      );
    }
    // Ajan / ekip / etiket düğümü: onun notları.
    const node = selectedNode;
    const list =
      node.type === "tag"
        ? notes.filter((n) => n.tags.includes(node.ref))
        : notes.filter((n) => n.owner === (node.type === "team" ? TEAM_OWNER : node.ref));
    const title = node.type === "team" ? t("brain.teamMemory") : node.label;
    return (
      <section data-node-detail={node.id} aria-label={title} className="flex h-full min-h-0 flex-col">
        <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(node) }} aria-hidden />
          <h2 className="min-w-0 truncate text-sm font-semibold text-slate-100">{title}</h2>
          <span className="text-2xs tabular-nums text-slate-500">{t("brain.agentNotes", { count: list.length })}</span>
          <button type="button" className={`${TOOL_BUTTON} ml-auto`} onClick={() => open(null)} aria-label={t("brain.close")}>
            <X size={14} />
          </button>
        </header>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {[...list]
            .sort((a, b) => b.updated - a.updated)
            .map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => openNote(n.id)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-slate-300 hover:bg-hover">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: KIND_COLOR[n.kind] }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{n.title}</span>
                  <span className="shrink-0 text-2xs text-slate-600">{noteAge(n.updated, Date.now(), t)}</span>
                </button>
              </li>
            ))}
        </ul>
        <footer className="flex items-center gap-2 border-t border-line px-4 py-2.5">
          {node.type !== "tag" && (
            <button type="button" className={TOOL_BUTTON} onClick={() => newNote("", node.type === "team" ? TEAM_OWNER : node.ref)}>
              <Plus size={13} /> {t("brain.newNote")}
            </button>
          )}
          {node.type === "agent" && agents.some((a) => a.id === node.ref) && (
            <button type="button" className={`${TOOL_BUTTON} ml-auto`} onClick={() => setMode("files")}>
              {t("brain.openFiles")}
            </button>
          )}
        </footer>
      </section>
    );
  })();

  return (
    <div data-memory-brain="" className="flex h-full min-h-0 flex-col bg-app">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-line px-4">
        <h1 className="text-sm font-semibold text-slate-100">{t("brain.title")}</h1>
        <span className="text-2xs tabular-nums text-slate-500">{t("brain.count", { count: notes.length })}</span>
        <Tabs
          label={t("brain.modes")}
          value={mode}
          onChange={(v) => setMode(v)}
          items={[
            { value: "map", label: t("brain.mode.map") },
            { value: "list", label: t("brain.mode.list") },
            { value: "files", label: t("brain.mode.files") }
          ]}
        />
        {mode !== "files" && (
          <>
            <div className="relative ml-auto w-60">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("brain.search")}
                aria-label={t("brain.searchLabel")}
                className="h-8 w-full rounded-md border border-line bg-control pl-8 pr-2 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-line-strong"
              />
            </div>
            <button type="button" className={TOOL_BUTTON} aria-expanded={showFilter} onClick={() => setShowFilter((v) => !v)}>
              <Filter size={13} /> {t("brain.filter")}
              {filterCount > 0 && <span className="rounded-full bg-hover px-1.5 text-2xs tabular-nums">{filterCount}</span>}
            </button>
            <button type="button" className={PRIMARY_BUTTON} onClick={() => newNote()}>
              <Plus size={13} /> {t("brain.newNote")}
            </button>
          </>
        )}
      </div>

      {mode !== "files" && (showFilter || filterCount > 0) && (
        <div data-brain-filters="" className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-line px-4 py-2">
          <ChipGroup label={t("brain.filterKind")}>
            {NOTE_KINDS.map((k) => (
              <FilterChip key={k} pressed={kinds.has(k)} onClick={() => setKinds((s) => toggle(s, k))} dot={KIND_COLOR[k]}>
                {t(`brain.kind.${k}` as TranslationKey)}
              </FilterChip>
            ))}
          </ChipGroup>
          <ChipGroup label={t("brain.filterOwner")}>
            <FilterChip pressed={owners.has(TEAM_OWNER)} onClick={() => setOwners((s) => toggle(s, TEAM_OWNER))}>
              {t("brain.team")}
            </FilterChip>
            {agents.map((a) => (
              <FilterChip key={a.id} pressed={owners.has(a.id)} onClick={() => setOwners((s) => toggle(s, a.id))} dot={a.color ?? undefined}>
                {a.name}
              </FilterChip>
            ))}
          </ChipGroup>
          {tagList.length > 0 && (
            <ChipGroup label={t("brain.filterTag")}>
              {tagList.map(({ tag }) => (
                <FilterChip key={tag} pressed={tags.has(tag)} onClick={() => setTags((s) => toggle(s, tag))}>
                  #{tag}
                </FilterChip>
              ))}
            </ChipGroup>
          )}
          {filterCount > 0 && (
            <button
              type="button"
              className="ml-auto text-2xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
              onClick={() => {
                setKinds(new Set());
                setOwners(new Set());
                setTags(new Set());
              }}
            >
              {t("brain.filterClear")}
            </button>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {mode === "files" ? (
          <div className="relative min-w-0 flex-1">
            <MemoryView workspace={workspace} />
          </div>
        ) : (
          <>
            <div className="relative min-w-0 flex-1">
              {loaded && notes.length === 0 ? (
                <div data-brain-empty="" className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
                  <p className="text-sm font-medium text-slate-200">{t("brain.emptyTitle")}</p>
                  <p className="max-w-md text-xs leading-relaxed text-slate-400">{t("brain.emptyBody")}</p>
                  <button type="button" className={TOOL_BUTTON} onClick={() => newNote()}>
                    <Plus size={13} /> {t("brain.newNote")}
                  </button>
                </div>
              ) : mode === "map" ? (
                <>
                  <MemoryGraphView graph={graph} visible={visible} selectedId={selected} onSelect={open} colorOf={colorOf} labelOf={labelOf} ariaOf={ariaOf} t={t} />
                  <Legend
                    agents={agents}
                    counts={counts}
                    owners={owners}
                    onOwner={(id) => setOwners((s) => (s.size === 1 && s.has(id) ? new Set() : new Set([id])))}
                    t={t}
                  />
                  {query.trim() && (
                    <SearchResults hits={hits} total={shown.length} onOpen={openNote} ownerName={ownerName} t={t} />
                  )}
                </>
              ) : (
                <NotesList notes={shown} selectedId={selectedNote?.id ?? null} onOpen={openNote} ownerName={ownerName} t={t} />
              )}
            </div>
            {side && <aside className="w-[22rem] shrink-0 border-l border-line bg-card">{side}</aside>}
          </>
        )}
      </div>
    </div>
  );
}

function ChipGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1">
      <span className="mr-1 text-2xs uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </div>
  );
}

function FilterChip({ pressed, onClick, dot, children }: { pressed: boolean; onClick(): void; dot?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-2xs transition ${
        pressed ? "border-[rgb(var(--accent-400-rgb))] bg-[var(--accent-glow)] text-slate-100" : "border-line text-slate-400 hover:bg-hover hover:text-slate-200"
      }`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} aria-hidden />}
      {children}
    </button>
  );
}

function Legend({
  agents,
  counts,
  owners,
  onOwner,
  t
}: {
  agents: { id: string; name: string; color: string | null }[];
  counts: Map<string, number>;
  owners: ReadonlySet<string>;
  onOwner(id: string): void;
  t: ReturnType<typeof useT>;
}) {
  const rows = [{ id: TEAM_OWNER, name: t("brain.team"), color: "rgb(203 213 225)" as string | null }, ...agents];
  return (
    <div data-brain-legend="" className="absolute bottom-3 left-3 w-52 rounded-md border border-line bg-card/95 p-2">
      <p className="px-1 pb-1 text-2xs text-slate-500">{t("brain.legend")}</p>
      <ul>
        {rows.map((r) => (
          <li key={r.id || "team"}>
            <button
              type="button"
              aria-pressed={owners.has(r.id)}
              onClick={() => onOwner(r.id)}
              className={`flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs ${owners.has(r.id) ? "bg-[var(--accent-glow)] text-slate-100" : "text-slate-300 hover:bg-hover"}`}
            >
              <span className="h-2 w-2 shrink-0 rounded-full border border-line" style={{ background: r.color ?? "transparent" }} aria-hidden />
              <span className="min-w-0 flex-1 truncate">{r.name}</span>
              <span className="tabular-nums text-2xs text-slate-500">{counts.get(r.id) ?? 0}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SearchResults({
  hits,
  total,
  onOpen,
  ownerName,
  t
}: {
  hits: ReturnType<typeof searchNotes>;
  total: number;
  onOpen(id: string): void;
  ownerName(owner: string, fallback?: string): string;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div data-brain-results="" role="region" aria-label={t("brain.searchLabel")} className="absolute left-3 right-3 top-3 max-h-[60%] max-w-xl overflow-y-auto rounded-md border border-line bg-card/95 p-2 shadow-lg">
      <div className="flex items-center justify-between px-1 pb-1 text-2xs text-slate-500">
        <span>{t("brain.searchLabel")}</span>
        <span aria-live="polite">{t("brain.results", { count: total })}</span>
      </div>
      {hits.length === 0 ? (
        <p className="px-1 py-1 text-xs text-slate-400">{t("brain.noResults")}</p>
      ) : (
        <ul>
          {hits.map((h) => (
            <li key={h.note.id}>
              <button type="button" onClick={() => onOpen(h.note.id)} className="w-full rounded px-1.5 py-1.5 text-left hover:bg-hover">
                <span className="flex items-center gap-2">
                  <span className="min-w-0 truncate text-xs font-medium text-slate-100">{h.note.title}</span>
                  <KindChip kind={h.note.kind} />
                </span>
                <span className="block truncate font-mono text-2xs text-slate-500">{ownerName(h.note.owner, h.note.ownerName)}</span>
                {h.snippet && <span className="block text-2xs text-slate-400">“{h.snippet}”</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Grafın klavye karşılığı: düz liste, ↑/↓/Home/End gezinir, Enter açar. */
function NotesList({
  notes,
  selectedId,
  onOpen,
  ownerName,
  t
}: {
  notes: MemoryNote[];
  selectedId: string | null;
  onOpen(id: string): void;
  ownerName(owner: string, fallback?: string): string;
  t: ReturnType<typeof useT>;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focus, setFocus] = useState(0);
  const at = Math.min(focus, Math.max(0, notes.length - 1));
  const move = (i: number) => {
    const next = Math.max(0, Math.min(notes.length - 1, i));
    setFocus(next);
    refs.current[next]?.focus();
  };
  const onKey = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key === "ArrowDown") move(at + 1);
    else if (e.key === "ArrowUp") move(at - 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(notes.length - 1);
    else return;
    e.preventDefault();
  };
  if (notes.length === 0) return <p className="px-4 py-6 text-xs text-slate-400">{t("brain.noResults")}</p>;
  return (
    <ul data-brain-list="" aria-label={t("brain.listLabel")} onKeyDown={onKey} className="h-full overflow-y-auto px-2 py-2">
      {notes.map((n, i) => (
        <li key={n.id}>
          <button
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            tabIndex={i === at ? 0 : -1}
            aria-current={n.id === selectedId ? "true" : undefined}
            onFocus={() => setFocus(i)}
            onClick={() => onOpen(n.id)}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left ${n.id === selectedId ? "bg-[var(--accent-glow)]" : "hover:bg-hover"}`}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: KIND_COLOR[n.kind] }} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] text-slate-100">{n.title}</span>
              <span className="block truncate text-2xs text-slate-500">
                {t(`brain.kind.${n.kind}` as TranslationKey)} · {ownerName(n.owner, n.ownerName)}
                {n.tags.length ? ` · #${n.tags.join(" #")}` : ""}
              </span>
            </span>
            <span className="shrink-0 text-2xs text-slate-600">{noteAge(n.updated, Date.now(), t)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
