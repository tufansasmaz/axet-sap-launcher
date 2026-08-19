import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronRight, ChevronDown, Folder, Server } from "lucide-react";
import type { ConnectivityState, SapNode, SapService, SystemTier } from "../../app-electron/shared/types";
import StatusDot from "./StatusDot";
import TierBadge from "./TierBadge";
import { resolveTier } from "../lib/tier";

interface TreeProps {
  nodes: SapNode[];
  search: string;
  selectedUuid: string | null;
  connectivity: Record<string, ConnectivityState>;
  tierOverrides: Record<string, SystemTier>;
  onSelect: (path: string[], service: SapService, itemUuid: string) => void;
}

type IsExpandedFn = (uuid: string, depth: number) => boolean;
type ToggleExpandFn = (uuid: string, depth: number) => void;
type RegisterRowRef = (uuid: string, el: HTMLElement | null) => void;

type FlatRow =
  | { kind: "folder"; uuid: string; depth: number }
  | { kind: "item"; uuid: string; depth: number; service: SapService; path: string[] };

function nodeMatches(node: SapNode, term: string): boolean {
  if (!term) return true;
  const lower = term.toLowerCase();
  if (node.name.toLowerCase().includes(lower)) return true;
  if (node.items.some((it) => it.service && (it.service.name.toLowerCase().includes(lower) || it.service.systemId.toLowerCase().includes(lower)))) {
    return true;
  }
  return node.nodes.some((child) => nodeMatches(child, lower));
}

function getVisibleChildren(node: SapNode, search: string): SapNode[] {
  return node.nodes
    .filter((child) => nodeMatches(child, search))
    .sort((a, b) => a.name.localeCompare(b.name, "tr", { sensitivity: "base" }));
}

function getVisibleItems(node: SapNode, search: string) {
  const hasSearch = search.trim().length > 0;
  const lower = search.toLowerCase();
  return node.items
    .filter(
      (it) =>
        it.service &&
        (!hasSearch ||
          it.service.name.toLowerCase().includes(lower) ||
          it.service.systemId.toLowerCase().includes(lower) ||
          node.name.toLowerCase().includes(lower))
    )
    .sort((a, b) => (a.service?.name ?? "").localeCompare(b.service?.name ?? "", "tr", { sensitivity: "base" }));
}

function buildFlatRows(
  node: SapNode,
  path: string[],
  depth: number,
  search: string,
  isExpandedFn: IsExpandedFn,
  rows: FlatRow[]
): void {
  const hasSearch = search.trim().length > 0;
  rows.push({ kind: "folder", uuid: node.uuid, depth });
  if (!(hasSearch || isExpandedFn(node.uuid, depth))) return;

  for (const child of getVisibleChildren(node, search)) {
    buildFlatRows(child, [...path, child.name], depth + 1, search, isExpandedFn, rows);
  }
  for (const item of getVisibleItems(node, search)) {
    if (!item.service) continue;
    rows.push({ kind: "item", uuid: item.uuid, depth: depth + 1, service: item.service, path });
  }
}

function TreeNode({
  node,
  depth,
  search,
  path,
  selectedUuid,
  focusedUuid,
  connectivity,
  tierOverrides,
  isExpandedFn,
  toggleExpand,
  registerRowRef,
  onSelect
}: {
  node: SapNode;
  depth: number;
  search: string;
  path: string[];
  selectedUuid: string | null;
  focusedUuid: string | null;
  connectivity: Record<string, ConnectivityState>;
  tierOverrides: Record<string, SystemTier>;
  isExpandedFn: IsExpandedFn;
  toggleExpand: ToggleExpandFn;
  registerRowRef: RegisterRowRef;
  onSelect: (path: string[], service: SapService, itemUuid: string) => void;
}) {
  const hasSearch = search.trim().length > 0;
  const isExpanded = hasSearch || isExpandedFn(node.uuid, depth);

  const visibleItems = getVisibleItems(node, search);
  const visibleChildren = getVisibleChildren(node, search);

  if (hasSearch && visibleItems.length === 0 && visibleChildren.length === 0 && !node.name.toLowerCase().includes(search.toLowerCase())) {
    return null;
  }

  const isFolderFocused = focusedUuid === node.uuid;

  return (
    <div>
      <button
        ref={(el) => registerRowRef(node.uuid, el)}
        onClick={() => toggleExpand(node.uuid, depth)}
        className={`flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm text-slate-300 hover:bg-base-700/60 ${
          isFolderFocused ? "ring-1 ring-inset ring-accent-400/70" : ""
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {isExpanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
        <Folder size={14} className="text-accent-400" />
        <span className="truncate">{node.name}</span>
      </button>

      {isExpanded && (
        <div>
          {visibleChildren.map((child) => (
            <TreeNode
              key={child.uuid}
              node={child}
              depth={depth + 1}
              search={search}
              path={[...path, child.name]}
              selectedUuid={selectedUuid}
              focusedUuid={focusedUuid}
              connectivity={connectivity}
              tierOverrides={tierOverrides}
              isExpandedFn={isExpandedFn}
              toggleExpand={toggleExpand}
              registerRowRef={registerRowRef}
              onSelect={onSelect}
            />
          ))}
          {visibleItems.map((item) => {
            const service = item.service!;
            const isSelected = selectedUuid === item.uuid;
            const isFocused = focusedUuid === item.uuid;
            const state = connectivity[service.uuid] ?? "unknown";
            const tier = resolveTier(service, tierOverrides);
            return (
              <button
                key={item.uuid}
                ref={(el) => registerRowRef(item.uuid, el)}
                onClick={() => onSelect(path, service, item.uuid)}
                className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                  isSelected ? "bg-accent-500/20 text-white" : "text-slate-300 hover:bg-base-700/60"
                } ${isFocused ? "ring-1 ring-inset ring-accent-400/70" : ""}`}
                style={{ paddingLeft: `${(depth + 1) * 14 + 8}px` }}
              >
                <Server size={13} className="shrink-0 text-slate-500" />
                <span className="truncate">{service.name}</span>
                {tier && <TierBadge tier={tier} />}
                <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-slate-500">{service.systemId}</span>
                <StatusDot state={state} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Tree({ nodes, search, selectedUuid, connectivity, tierOverrides, onSelect }: TreeProps) {
  const [expandedOverrides, setExpandedOverrides] = useState<Record<string, boolean>>({});
  const [focusedUuid, setFocusedUuid] = useState<string | null>(null);
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());

  const isExpandedFn = useCallback<IsExpandedFn>((uuid, depth) => expandedOverrides[uuid] ?? depth < 1, [expandedOverrides]);

  const toggleExpand = useCallback<ToggleExpandFn>((uuid, depth) => {
    setFocusedUuid(uuid);
    setExpandedOverrides((prev) => ({ ...prev, [uuid]: !(prev[uuid] ?? depth < 1) }));
  }, []);

  const registerRowRef = useCallback<RegisterRowRef>((uuid, el) => {
    if (el) rowRefs.current.set(uuid, el);
    else rowRefs.current.delete(uuid);
  }, []);

  const handleSelectRow = useCallback(
    (path: string[], service: SapService, itemUuid: string) => {
      setFocusedUuid(itemUuid);
      onSelect(path, service, itemUuid);
    },
    [onSelect]
  );

  const filtered = useMemo(() => {
    const matched = nodes.filter((n) => nodeMatches(n, search));
    const pinned = matched.filter((n) => n.uuid === "manual-systems-root");
    const rest = matched
      .filter((n) => n.uuid !== "manual-systems-root")
      .sort((a, b) => a.name.localeCompare(b.name, "tr", { sensitivity: "base" }));
    return [...pinned, ...rest];
  }, [nodes, search]);

  const flatRows = useMemo(() => {
    const rows: FlatRow[] = [];
    for (const node of filtered) {
      buildFlatRows(node, [node.name], 0, search, isExpandedFn, rows);
    }
    return rows;
  }, [filtered, search, isExpandedFn]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (flatRows.length === 0) return;
    const currentIndex = focusedUuid ? flatRows.findIndex((r) => r.uuid === focusedUuid) : -1;

    const focusRow = (row: FlatRow) => {
      setFocusedUuid(row.uuid);
      rowRefs.current.get(row.uuid)?.scrollIntoView({ block: "nearest" });
    };

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = flatRows[Math.min(flatRows.length - 1, currentIndex + 1)];
      if (next) focusRow(next);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
      const prev = flatRows[prevIndex];
      if (prev) focusRow(prev);
    } else if (e.key === "ArrowRight") {
      const row = flatRows[currentIndex];
      if (row?.kind === "folder" && !(search.trim() || isExpandedFn(row.uuid, row.depth))) {
        e.preventDefault();
        toggleExpand(row.uuid, row.depth);
      }
    } else if (e.key === "ArrowLeft") {
      const row = flatRows[currentIndex];
      if (row?.kind === "folder" && isExpandedFn(row.uuid, row.depth)) {
        e.preventDefault();
        toggleExpand(row.uuid, row.depth);
      }
    } else if (e.key === "Enter" || e.key === " ") {
      const row = flatRows[currentIndex];
      if (!row) return;
      e.preventDefault();
      if (row.kind === "folder") {
        toggleExpand(row.uuid, row.depth);
      } else {
        handleSelectRow(row.path, row.service, row.uuid);
      }
    }
  };

  if (filtered.length === 0) {
    return <div className="px-3 py-6 text-center text-sm text-slate-500">Eşleşen müşteri/sistem bulunamadı.</div>;
  }

  return (
    <div className="space-y-0.5 outline-none" tabIndex={0} onKeyDown={handleKeyDown}>
      {filtered.map((node) => (
        <TreeNode
          key={node.uuid}
          node={node}
          depth={0}
          search={search}
          path={[node.name]}
          selectedUuid={selectedUuid}
          focusedUuid={focusedUuid}
          connectivity={connectivity}
          tierOverrides={tierOverrides}
          isExpandedFn={isExpandedFn}
          toggleExpand={toggleExpand}
          registerRowRef={registerRowRef}
          onSelect={handleSelectRow}
        />
      ))}
    </div>
  );
}
