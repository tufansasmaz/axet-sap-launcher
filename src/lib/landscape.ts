import type { SapNode, SapService } from "../../app-electron/shared/types";

export interface FlatSystem {
  path: string[];
  service: SapService;
  itemUuid: string;
}

export function flattenLandscape(nodes: SapNode[]): FlatSystem[] {
  const out: FlatSystem[] = [];

  function walk(node: SapNode, path: string[]) {
    for (const item of node.items) {
      if (item.service) {
        out.push({ path, service: item.service, itemUuid: item.uuid });
      }
    }
    for (const child of node.nodes) {
      walk(child, [...path, child.name]);
    }
  }

  for (const node of nodes) {
    walk(node, [node.name]);
  }

  return out;
}
