import { genId } from './idgen.js';
import { catalogEntry, isConfigType } from './nodeCatalog.js';

function outputCountFor(type, config) {
  const entry = catalogEntry(type);
  if (entry.outputs === 'dynamic') {
    const n = Number(config?.[entry.outputsField] ?? config?.outputs ?? 1);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }
  return typeof entry.outputs === 'number' ? entry.outputs : 1;
}

function ensureWiresLength(wires, len) {
  const next = Array.isArray(wires) ? wires.slice() : [];
  while (next.length < len) next.push([]);
  return next;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export class FlowModel {
  constructor() {
    const firstTabId = genId();
    this.tabs = [{ id: firstTabId, name: 'Flow 1', description: '' }];
    this.subflows = [];
    this.activeContainerId = firstTabId;
    this.activeContainerKind = 'tab';
    this.previousContainerId = null;
    this.nodesById = {};
    this.order = [];
    this._clipboard = null;
    this._undoStack = [];
    this._redoStack = [];
    this._undoCap = 50;
  }

  _snapshotState() {
    return deepClone({
      tabs: this.tabs,
      subflows: this.subflows,
      activeContainerId: this.activeContainerId,
      activeContainerKind: this.activeContainerKind,
      previousContainerId: this.previousContainerId,
      nodesById: this.nodesById,
      order: this.order
    });
  }

  _loadState(state) {
    const s = deepClone(state);
    this.tabs = s.tabs;
    this.subflows = s.subflows;
    this.activeContainerId = s.activeContainerId;
    this.activeContainerKind = s.activeContainerKind;
    this.previousContainerId = s.previousContainerId;
    this.nodesById = s.nodesById;
    this.order = s.order;
  }

  _pushUndo() {
    this._undoStack.push(this._snapshotState());
    if (this._undoStack.length > this._undoCap) this._undoStack.shift();
    this._redoStack = [];
  }

  canUndo() {
    return this._undoStack.length > 0;
  }

  canRedo() {
    return this._redoStack.length > 0;
  }

  undo() {
    if (!this._undoStack.length) return false;
    this._redoStack.push(this._snapshotState());
    const prev = this._undoStack.pop();
    this._loadState(prev);
    return true;
  }

  redo() {
    if (!this._redoStack.length) return false;
    this._undoStack.push(this._snapshotState());
    const next = this._redoStack.pop();
    this._loadState(next);
    return true;
  }

  copySelection(ids) {
    const nodes = (ids || [])
      .map((id) => this.nodesById[id])
      .filter((n) => n && !isConfigType(n.type) && n.type !== 'subflow-in' && n.type !== 'subflow-out');
    this._clipboard = deepClone(nodes);
    return this._clipboard.length;
  }

  pasteClipboard(containerId = this.activeContainerId, offset = { x: 40, y: 40 }) {
    if (!this._clipboard || this._clipboard.length === 0) return [];
    this._pushUndo();
    const idMap = new Map();
    this._clipboard.forEach((n) => idMap.set(n.id, genId()));
    const nodesById = { ...this.nodesById };
    const newIds = [];
    this._clipboard.forEach((n) => {
      const newId = idMap.get(n.id);
      const wires = Array.isArray(n.wires)
        ? n.wires.map((arr) => (arr || []).filter((toId) => idMap.has(toId)).map((toId) => idMap.get(toId)))
        : undefined;
      nodesById[newId] = {
        ...deepClone(n),
        id: newId,
        z: containerId,
        x: (n.x ?? 100) + offset.x,
        y: (n.y ?? 100) + offset.y,
        ...(wires ? { wires } : {})
      };
      newIds.push(newId);
    });
    this.nodesById = nodesById;
    this.order = [...this.order, ...newIds];
    return newIds;
  }

  duplicateSelection(ids) {
    this.copySelection(ids);
    return this.pasteClipboard(this.activeContainerId, { x: 40, y: 40 });
  }

  get activeTabId() {
    return this.activeContainerId;
  }

  isTabId(id) {
    return this.tabs.some((t) => t.id === id);
  }

  isSubflowId(id) {
    return this.subflows.some((s) => s.id === id);
  }

  snapshot() {
    return {
      tabs: this.tabs.slice(),
      subflows: this.subflows.slice(),
      activeContainerId: this.activeContainerId,
      activeContainerKind: this.activeContainerKind,
      activeTabId: this.activeContainerId,
      previousContainerId: this.previousContainerId,
      nodesById: this.nodesById,
      order: this.order.slice()
    };
  }

  importFlow(arr) {
    this._undoStack = [];
    this._redoStack = [];
    const nodesById = {};
    const order = [];
    const tabs = [];
    const subflowDefs = [];
    for (const n of Array.isArray(arr) ? arr : []) {
      if (n.type === 'tab') {
        tabs.push({ id: n.id, name: n.label || n.name || `Flow ${tabs.length + 1}`, description: n.info || '' });
        continue;
      }
      if (n.type === 'subflow') {
        subflowDefs.push(n);
        continue;
      }
      nodesById[n.id] = { ...n };
      order.push(n.id);
    }
    if (tabs.length === 0) {
      const zCounts = {};
      for (const n of Object.values(nodesById)) {
        if (n.z) zCounts[n.z] = (zCounts[n.z] || 0) + 1;
      }
      const subflowIds = new Set(subflowDefs.map((s) => s.id));
      const zIds = Object.keys(zCounts)
        .filter((z) => !subflowIds.has(z))
        .sort((a, b) => zCounts[b] - zCounts[a]);
      if (zIds.length) {
        zIds.forEach((zid, i) => tabs.push({ id: zid, name: `Flow ${i + 1}`, description: '' }));
      } else {
        tabs.push({ id: genId(), name: 'Flow 1', description: '' });
      }
    } else {
      tabs.forEach((t) => {
        if (t.description === undefined) t.description = '';
      });
    }

    const subflows = [];
    subflowDefs.forEach((sf) => {
      subflows.push({ id: sf.id, name: sf.name || 'Subflow', info: sf.info || '', category: sf.category || '' });
      (sf.in || []).forEach((port, idx) => {
        const pid = genId();
        nodesById[pid] = {
          id: pid,
          type: 'subflow-in',
          z: sf.id,
          name: `in ${idx + 1}`,
          x: typeof port.x === 'number' ? port.x : 80,
          y: typeof port.y === 'number' ? port.y : 80 + idx * 90,
          wires: [(port.wires || []).map((w) => w.id)]
        };
        order.push(pid);
      });
      (sf.out || []).forEach((port, idx) => {
        const pid = genId();
        nodesById[pid] = {
          id: pid,
          type: 'subflow-out',
          z: sf.id,
          name: `out ${idx + 1}`,
          x: typeof port.x === 'number' ? port.x : 600,
          y: typeof port.y === 'number' ? port.y : 80 + idx * 90
        };
        order.push(pid);
        (port.wires || []).forEach((w) => {
          const source = nodesById[w.id];
          if (!source) return;
          const outIdx = typeof w.port === 'number' ? w.port : 0;
          source.wires = ensureWiresLength(source.wires, outIdx + 1);
          if (!source.wires[outIdx].includes(pid)) source.wires[outIdx] = [...source.wires[outIdx], pid];
        });
      });
    });

    this.tabs = tabs;
    this.subflows = subflows;
    this.activeContainerId = tabs[0].id;
    this.activeContainerKind = 'tab';
    this.previousContainerId = null;
    this.nodesById = nodesById;
    this.order = order;
  }

  resetFlow() {
    this._undoStack = [];
    this._redoStack = [];
    const firstTabId = genId();
    this.tabs = [{ id: firstTabId, name: 'Flow 1', description: '' }];
    this.subflows = [];
    this.activeContainerId = firstTabId;
    this.activeContainerKind = 'tab';
    this.previousContainerId = null;
    this.nodesById = {};
    this.order = [];
  }

  addTab(name) {
    this._pushUndo();
    const id = genId();
    const tabName = name || `Flow ${this.tabs.length + 1}`;
    this.tabs = [...this.tabs, { id, name: tabName, description: '' }];
    this.activeContainerId = id;
    this.activeContainerKind = 'tab';
    return id;
  }

  renameTab(id, name) {
    this._pushUndo();
    this.tabs = this.tabs.map((t) => (t.id === id ? { ...t, name } : t));
  }

  setTabDescription(id, description) {
    this._pushUndo();
    this.tabs = this.tabs.map((t) => (t.id === id ? { ...t, description } : t));
  }

  setActiveTab(id) {
    this.setActiveContainer(id);
  }

  setActiveContainer(id) {
    if (this.isTabId(id)) {
      this.activeContainerId = id;
      this.activeContainerKind = 'tab';
    } else if (this.isSubflowId(id)) {
      this.activeContainerId = id;
      this.activeContainerKind = 'subflow';
    } else {
      throw new Error(`setActiveContainer: container bulunamadi (${id})`);
    }
  }

  removeTab(id) {
    if (this.tabs.length <= 1) throw new Error('removeTab: son flow sekmesi silinemez');
    this._pushUndo();
    const idsToRemove = new Set(this.order.filter((nid) => this.nodesById[nid]?.z === id));
    const nodesById = {};
    for (const [nid, n] of Object.entries(this.nodesById)) {
      if (idsToRemove.has(nid)) continue;
      const cleaned = { ...n };
      if (Array.isArray(cleaned.wires)) {
        cleaned.wires = cleaned.wires.map((wireArr) => wireArr.filter((w) => !idsToRemove.has(w)));
      }
      nodesById[nid] = cleaned;
    }
    this.nodesById = nodesById;
    this.order = this.order.filter((nid) => !idsToRemove.has(nid));
    this.tabs = this.tabs.filter((t) => t.id !== id);
    if (this.activeContainerId === id) {
      this.activeContainerId = this.tabs[0].id;
      this.activeContainerKind = 'tab';
    }
  }

  createSubflow(name) {
    this._pushUndo();
    const id = genId();
    const sfName = name || `Subflow ${this.subflows.length + 1}`;
    this.subflows = [...this.subflows, { id, name: sfName, info: '', category: '' }];
    this.previousContainerId = this.activeContainerId;
    this.activeContainerId = id;
    this.activeContainerKind = 'subflow';
    const inId = genId();
    const outId = genId();
    this.nodesById = {
      ...this.nodesById,
      [inId]: { id: inId, type: 'subflow-in', z: id, name: 'in', x: 80, y: 120, wires: [[]] },
      [outId]: { id: outId, type: 'subflow-out', z: id, name: 'out', x: 420, y: 120 }
    };
    this.order = [...this.order, inId, outId];
    return id;
  }

  renameSubflow(id, name) {
    this._pushUndo();
    this.subflows = this.subflows.map((s) => (s.id === id ? { ...s, name } : s));
  }

  editSubflow(id) {
    if (!this.isSubflowId(id)) throw new Error(`editSubflow: subflow bulunamadi (${id})`);
    if (this.activeContainerId !== id) this.previousContainerId = this.activeContainerId;
    this.activeContainerId = id;
    this.activeContainerKind = 'subflow';
  }

  exitSubflow() {
    const target = this.previousContainerId && (this.isTabId(this.previousContainerId) || this.isSubflowId(this.previousContainerId))
      ? this.previousContainerId
      : this.tabs[0]?.id;
    if (!target) return;
    this.setActiveContainer(target);
    this.previousContainerId = null;
  }

  removeSubflow(id) {
    this._pushUndo();
    const idsToRemove = new Set(this.order.filter((nid) => this.nodesById[nid]?.z === id));
    const nodesById = {};
    for (const [nid, n] of Object.entries(this.nodesById)) {
      if (idsToRemove.has(nid)) continue;
      const cleaned = { ...n };
      if (Array.isArray(cleaned.wires)) {
        cleaned.wires = cleaned.wires.map((wireArr) => wireArr.filter((w) => !idsToRemove.has(w)));
      }
      nodesById[nid] = cleaned;
    }
    this.nodesById = nodesById;
    this.order = this.order.filter((nid) => !idsToRemove.has(nid));
    this.subflows = this.subflows.filter((s) => s.id !== id);
    if (this.activeContainerId === id) {
      this.activeContainerId = this.tabs[0].id;
      this.activeContainerKind = 'tab';
    }
  }

  instanceCountFor(subflowId) {
    return this.order.filter((nid) => this.nodesById[nid]?.type === `subflow:${subflowId}`).length;
  }

  createSubflowFromSelection(nodeIds, name) {
    const ids = (nodeIds || []).filter((id) => this.nodesById[id] && !isConfigType(this.nodesById[id].type));
    if (ids.length === 0) throw new Error('createSubflowFromSelection: gecerli node secilmedi');
    this._pushUndo();
    const selectionSet = new Set(ids);
    const originTabId = this.nodesById[ids[0]].z;

    const subflowId = genId();
    const sfName = name || `Subflow ${this.subflows.length + 1}`;
    this.subflows = [...this.subflows, { id: subflowId, name: sfName, info: '', category: '' }];

    const nodesById = { ...this.nodesById };
    let minX = Infinity;
    let maxX = -Infinity;
    let sumY = 0;
    ids.forEach((id) => {
      const n = nodesById[id];
      minX = Math.min(minX, n.x ?? 0);
      maxX = Math.max(maxX, n.x ?? 0);
      sumY += n.y ?? 0;
    });
    const avgY = sumY / ids.length;

    // Disari giden kenarlar: selection DISINDA bir node, wire'i selection'a bakiyorsa.
    const inboundEdges = [];
    Object.values(nodesById).forEach((n) => {
      if (selectionSet.has(n.id) || isConfigType(n.type)) return;
      (n.wires || []).forEach((arr, outIdx) => {
        (arr || []).forEach((toId) => {
          if (selectionSet.has(toId)) inboundEdges.push({ sourceId: n.id, outIdx, targetId: toId });
        });
      });
    });

    // Disari cikan kenarlar: selection ICINDE bir node, wire'i selection DISINA bakiyorsa.
    const outboundEdges = [];
    ids.forEach((id) => {
      const n = nodesById[id];
      (n.wires || []).forEach((arr, outIdx) => {
        (arr || []).forEach((toId) => {
          if (!selectionSet.has(toId) && nodesById[toId] && !isConfigType(nodesById[toId].type)) {
            outboundEdges.push({ sourceId: id, outIdx, targetId: toId });
          }
        });
      });
    });

    const needsInPort = inboundEdges.length > 0;
    const needsOutPort = outboundEdges.length > 0;
    let inPortId = null;
    let outPortId = null;

    if (needsInPort) {
      inPortId = genId();
      const entryTargets = new Set(inboundEdges.map((e) => e.targetId));
      const bySource = new Map();
      inboundEdges.forEach((e) => {
        const key = `${e.sourceId}:${e.outIdx}`;
        if (!bySource.has(key)) bySource.set(key, { sourceId: e.sourceId, outIdx: e.outIdx });
      });
      bySource.forEach(({ sourceId, outIdx }) => {
        const src = nodesById[sourceId];
        const wires = (src.wires || []).map((arr, idx) => {
          if (idx !== outIdx) return arr;
          return arr.filter((toId) => !selectionSet.has(toId));
        });
        nodesById[sourceId] = { ...src, wires };
      });
      nodesById[inPortId] = {
        id: inPortId,
        type: 'subflow-in',
        z: subflowId,
        name: 'in',
        x: 80,
        y: 120,
        wires: [Array.from(entryTargets)]
      };
    }

    if (needsOutPort) {
      outPortId = genId();
      const bySource = new Map();
      outboundEdges.forEach((e) => {
        const key = `${e.sourceId}:${e.outIdx}`;
        if (!bySource.has(key)) bySource.set(key, { sourceId: e.sourceId, outIdx: e.outIdx });
      });
      bySource.forEach(({ sourceId, outIdx }) => {
        const src = nodesById[sourceId];
        const wires = (src.wires || []).map((arr, idx) => {
          if (idx !== outIdx) return arr;
          const kept = arr.filter((toId) => selectionSet.has(toId) || !outboundEdges.some((e) => e.sourceId === sourceId && e.outIdx === outIdx && e.targetId === toId));
          if (!kept.includes(outPortId)) kept.push(outPortId);
          return kept;
        });
        nodesById[sourceId] = { ...src, wires };
      });
      nodesById[outPortId] = { id: outPortId, type: 'subflow-out', z: subflowId, name: 'out', x: 420, y: 120 };
    }

    ids.forEach((id) => {
      nodesById[id] = { ...nodesById[id], z: subflowId };
    });

    const instanceId = genId();
    const externalTargets = Array.from(new Set(outboundEdges.map((e) => e.targetId)));
    const instanceWires = needsOutPort ? [externalTargets] : [[]];
    nodesById[instanceId] = {
      id: instanceId,
      type: `subflow:${subflowId}`,
      z: originTabId,
      name: sfName,
      x: Number.isFinite(minX) ? (minX + maxX) / 2 : 200,
      y: Number.isFinite(avgY) ? avgY : 200,
      wires: instanceWires
    };

    if (needsInPort) {
      const bySource = new Map();
      inboundEdges.forEach((e) => {
        const key = `${e.sourceId}:${e.outIdx}`;
        if (!bySource.has(key)) bySource.set(key, { sourceId: e.sourceId, outIdx: e.outIdx });
      });
      bySource.forEach(({ sourceId, outIdx }) => {
        const src = nodesById[sourceId];
        const wires = (src.wires || []).map((arr, idx) => {
          if (idx !== outIdx) return arr;
          return arr.includes(instanceId) ? arr : [...arr, instanceId];
        });
        nodesById[sourceId] = { ...src, wires };
      });
    }

    const extraIds = [inPortId, outPortId, instanceId].filter(Boolean);
    this.nodesById = nodesById;
    this.order = [...this.order, ...extraIds];

    this.autoLayout(subflowId);
    return { subflowId, instanceId };
  }

  addNode({ id, type, name, config = {}, x, y, tabId } = {}) {
    if (!type) throw new Error('addNode: type zorunlu');
    this._pushUndo();
    const nodeId = id || genId();
    const configFlag = isConfigType(type);
    const node = {
      id: nodeId,
      type,
      ...(configFlag ? {} : { z: tabId || this.activeContainerId }),
      name: name ?? config.name ?? '',
      ...config
    };
    if (!configFlag) {
      const outCount = outputCountFor(type, config);
      node.wires = ensureWiresLength(config.wires, outCount);
      node.x = typeof x === 'number' ? x : 100;
      node.y = typeof y === 'number' ? y : 100;
    }
    this.nodesById = { ...this.nodesById, [nodeId]: node };
    if (!this.order.includes(nodeId)) this.order = [...this.order, nodeId];
    return nodeId;
  }

  updateNode(id, changes = {}) {
    const existing = this.nodesById[id];
    if (!existing) throw new Error(`updateNode: node bulunamadi (${id})`);
    this._pushUndo();
    const updated = { ...existing, ...changes };
    if (!isConfigType(existing.type) && changes.outputs !== undefined) {
      const outCount = outputCountFor(existing.type, updated);
      updated.wires = ensureWiresLength(updated.wires, outCount);
    }
    this.nodesById = { ...this.nodesById, [id]: updated };
  }

  moveNodes(moves) {
    const valid = (moves || []).filter((m) => this.nodesById[m.id]);
    if (valid.length === 0) return;
    this._pushUndo();
    const nodesById = { ...this.nodesById };
    valid.forEach(({ id, x, y }) => {
      nodesById[id] = { ...nodesById[id], x, y };
    });
    this.nodesById = nodesById;
  }

  removeNode(id) {
    if (!this.nodesById[id]) throw new Error(`removeNode: node bulunamadi (${id})`);
    this._pushUndo();
    const nodesById = {};
    for (const [nid, n] of Object.entries(this.nodesById)) {
      if (nid === id) continue;
      const cleaned = { ...n };
      if (Array.isArray(cleaned.wires)) {
        cleaned.wires = cleaned.wires.map((arr) => arr.filter((w) => w !== id));
      }
      nodesById[nid] = cleaned;
    }
    this.nodesById = nodesById;
    this.order = this.order.filter((nid) => nid !== id);
  }

  removeNodes(ids) {
    const idSet = new Set((ids || []).filter((id) => this.nodesById[id]));
    if (idSet.size === 0) return;
    this._pushUndo();
    const nodesById = {};
    for (const [nid, n] of Object.entries(this.nodesById)) {
      if (idSet.has(nid)) continue;
      const cleaned = { ...n };
      if (Array.isArray(cleaned.wires)) {
        cleaned.wires = cleaned.wires.map((arr) => arr.filter((w) => !idSet.has(w)));
      }
      nodesById[nid] = cleaned;
    }
    this.nodesById = nodesById;
    this.order = this.order.filter((nid) => !idSet.has(nid));
  }

  connect(fromId, toId, output = 0) {
    const from = this.nodesById[fromId];
    const to = this.nodesById[toId];
    if (!from) throw new Error(`connect: kaynak node bulunamadi (${fromId})`);
    if (!to) throw new Error(`connect: hedef node bulunamadi (${toId})`);
    this._pushUndo();
    const wires = ensureWiresLength(from.wires, output + 1);
    if (!wires[output].includes(toId)) wires[output] = [...wires[output], toId];
    this.nodesById = { ...this.nodesById, [fromId]: { ...from, wires } };
  }

  disconnect(fromId, toId, output = 0) {
    const from = this.nodesById[fromId];
    if (!from || !Array.isArray(from.wires) || !from.wires[output]) return;
    this._pushUndo();
    const wires = from.wires.slice();
    wires[output] = wires[output].filter((w) => w !== toId);
    this.nodesById = { ...this.nodesById, [fromId]: { ...from, wires } };
  }

  disconnectMany(links) {
    const valid = (links || []).filter((l) => this.nodesById[l.fromId]);
    if (valid.length === 0) return;
    this._pushUndo();
    const nodesById = { ...this.nodesById };
    valid.forEach(({ fromId, toId, output = 0 }) => {
      const from = nodesById[fromId];
      if (!from || !Array.isArray(from.wires) || !from.wires[output]) return;
      const wires = from.wires.slice();
      wires[output] = wires[output].filter((w) => w !== toId);
      nodesById[fromId] = { ...from, wires };
    });
    this.nodesById = nodesById;
  }

  autoLayout(containerId = this.activeContainerId) {
    this._pushUndo();
    const nodesById = { ...this.nodesById };
    const canvasIds = this.order.filter((id) => !isConfigType(nodesById[id]?.type) && nodesById[id]?.z === containerId);
    const incoming = {};
    canvasIds.forEach((id) => (incoming[id] = 0));
    canvasIds.forEach((id) => {
      const n = nodesById[id];
      (n.wires || []).forEach((arr) =>
        arr.forEach((toId) => {
          if (incoming[toId] !== undefined) incoming[toId] += 1;
        })
      );
    });
    const level = {};
    const roots = canvasIds.filter((id) => incoming[id] === 0);
    const queue = roots.map((id) => ({ id, lvl: 0 }));
    const seen = new Set();
    let guard = 0;
    while (queue.length && guard < 5000) {
      guard++;
      const { id, lvl } = queue.shift();
      const key = `${id}`;
      if (seen.has(key) && level[id] >= lvl) continue;
      seen.add(key);
      level[id] = Math.max(level[id] ?? 0, lvl);
      const n = nodesById[id];
      (n.wires || []).forEach((arr) =>
        arr.forEach((toId) => {
          if (canvasIds.includes(toId)) queue.push({ id: toId, lvl: lvl + 1 });
        })
      );
    }
    canvasIds.forEach((id) => {
      if (level[id] === undefined) level[id] = 0;
    });
    const perLevelCount = {};
    canvasIds.forEach((id) => {
      const lvl = level[id];
      const idx = perLevelCount[lvl] || 0;
      perLevelCount[lvl] = idx + 1;
      nodesById[id] = { ...nodesById[id], x: 120 + lvl * 220, y: 100 + idx * 130 };
    });
    this.nodesById = nodesById;
  }

  subflowPortsFor(subflowId) {
    const inNodes = this.order
      .map((id) => this.nodesById[id])
      .filter((n) => n && n.z === subflowId && n.type === 'subflow-in');
    const outNodes = this.order
      .map((id) => this.nodesById[id])
      .filter((n) => n && n.z === subflowId && n.type === 'subflow-out');
    return { inCount: inNodes.length, outCount: outNodes.length };
  }

  toArray() {
    const tabEntries = this.tabs.map((t) => ({ id: t.id, type: 'tab', label: t.name, disabled: false, info: t.description || '', env: [] }));
    const subflowEntries = this.subflows.map((sf) => {
      const inNodes = this.order.map((id) => this.nodesById[id]).filter((n) => n && n.z === sf.id && n.type === 'subflow-in');
      const outNodes = this.order.map((id) => this.nodesById[id]).filter((n) => n && n.z === sf.id && n.type === 'subflow-out');
      const inPorts = inNodes.map((n) => ({
        x: n.x ?? 80,
        y: n.y ?? 80,
        wires: (n.wires?.[0] || []).map((id) => ({ id }))
      }));
      const outPorts = outNodes.map((outNode) => {
        const wires = [];
        this.order.forEach((id) => {
          const n = this.nodesById[id];
          if (!n || n.z !== sf.id || isConfigType(n.type) || n.type === 'subflow-in' || n.type === 'subflow-out') return;
          (n.wires || []).forEach((arr, outIdx) => {
            if ((arr || []).includes(outNode.id)) wires.push({ id: n.id, port: outIdx });
          });
        });
        return { x: outNode.x ?? 420, y: outNode.y ?? 80, wires };
      });
      return {
        id: sf.id,
        type: 'subflow',
        name: sf.name,
        info: sf.info || '',
        category: sf.category || '',
        in: inPorts,
        out: outPorts,
        env: []
      };
    });
    const nodes = this.order
      .map((id) => this.nodesById[id])
      .filter(Boolean)
      .filter((n) => n.type !== 'subflow-in' && n.type !== 'subflow-out')
      .map((n) => this.stripPseudoPortWires(n));
    return [...tabEntries, ...subflowEntries, ...nodes];
  }

  stripPseudoPortWires(node) {
    if (!Array.isArray(node.wires)) return node;
    const pseudoIds = new Set(
      this.order.filter((id) => {
        const n = this.nodesById[id];
        return n && (n.type === 'subflow-in' || n.type === 'subflow-out');
      })
    );
    if (pseudoIds.size === 0) return node;
    const wires = node.wires.map((arr) => (arr || []).filter((toId) => !pseudoIds.has(toId)));
    return { ...node, wires };
  }

  toDeployArray(tabId) {
    return this.order
      .map((id) => this.nodesById[id])
      .filter(Boolean)
      .filter((n) => n.type !== 'subflow-in' && n.type !== 'subflow-out')
      .filter((n) => (tabId ? isConfigType(n.type) || n.z === tabId : true))
      .map((n) => this.stripPseudoPortWires(n));
  }

  compactSummary() {
    const activeTab = this.tabs.find((t) => t.id === this.activeContainerId);
    const activeSubflow = this.subflows.find((s) => s.id === this.activeContainerId);
    const nodes = this.order
      .map((id) => this.nodesById[id])
      .filter(Boolean)
      .filter((n) => isConfigType(n.type) || n.z === this.activeContainerId)
      .map((n) => ({
        id: n.id,
        type: n.type,
        name: n.name || undefined,
        wires: isConfigType(n.type) ? undefined : n.wires
      }));
    return {
      tabs: this.tabs.map((t) => ({ id: t.id, name: t.name })),
      subflows: this.subflows.map((s) => ({ id: s.id, name: s.name })),
      activeContainer: activeTab
        ? { id: activeTab.id, name: activeTab.name, kind: 'tab' }
        : activeSubflow
          ? { id: activeSubflow.id, name: activeSubflow.name, kind: 'subflow' }
          : null,
      activeTab: activeTab ? { id: activeTab.id, name: activeTab.name } : null,
      nodes
    };
  }

  compactSummaryFallback() {
    return this.compactSummary();
  }
}
