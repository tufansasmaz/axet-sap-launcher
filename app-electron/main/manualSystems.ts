import { app } from "electron";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { AddManualSystemInput, ManualSystem } from "../shared/types";
import { normalizeAdtBaseUrl } from "./adtDiscovery";

function manualSystemsPath(): string {
  return path.join(app.getPath("userData"), "manual-systems.json");
}

export function loadManualSystems(): ManualSystem[] {
  const file = manualSystemsPath();
  if (!existsSync(file)) return [];
  try {
    const parsed = JSON.parse(readFileSync(file, "utf-8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveManualSystems(systems: ManualSystem[]): void {
  const file = manualSystemsPath();
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(systems, null, 2), "utf-8");
}

export function addManualSystem(input: AddManualSystemInput): ManualSystem {
  const systems = loadManualSystems();
  const trimmedAdtUrl = input.adtUrl?.trim() || null;
  const system: ManualSystem = {
    id: randomUUID(),
    name: input.name.trim(),
    systemId: input.systemId.trim().toUpperCase(),
    type: input.type,
    host: input.host?.trim() || null,
    diagPort: input.diagPort ?? null,
    // Normalize a pasted Fiori Launchpad / UI link (e.g. ".../ui?sap-language=TR#Shell-")
    // down to just the ADT base origin (scheme://host[:port]) — ADT REST calls 404/HTML-wall
    // against anything with a path/query/fragment tacked on.
    adtUrl: trimmedAdtUrl ? normalizeAdtBaseUrl(trimmedAdtUrl) : null,
    createdAt: new Date().toISOString()
  };
  systems.push(system);
  saveManualSystems(systems);
  return system;
}

export function removeManualSystem(id: string): ManualSystem[] {
  const systems = loadManualSystems().filter((s) => s.id !== id);
  saveManualSystems(systems);
  return systems;
}

export function updateManualSystem(id: string, input: AddManualSystemInput): ManualSystem | null {
  const systems = loadManualSystems();
  const idx = systems.findIndex((s) => s.id === id);
  if (idx === -1) return null;

  const trimmedAdtUrl = input.adtUrl?.trim() || null;
  const updated: ManualSystem = {
    ...systems[idx],
    name: input.name.trim(),
    systemId: input.systemId.trim().toUpperCase(),
    type: input.type,
    host: input.host?.trim() || null,
    diagPort: input.diagPort ?? null,
    adtUrl: trimmedAdtUrl ? normalizeAdtBaseUrl(trimmedAdtUrl) : null
  };
  systems[idx] = updated;
  saveManualSystems(systems);
  return updated;
}

export function exportManualSystemsToFile(filePath: string): void {
  const systems = loadManualSystems();
  writeFileSync(filePath, JSON.stringify(systems, null, 2), "utf-8");
}

function dedupeKey(s: Pick<ManualSystem, "name" | "systemId" | "host" | "adtUrl">): string {
  return `${s.name.toLowerCase()}::${s.systemId.toLowerCase()}::${(s.host ?? s.adtUrl ?? "").toLowerCase()}`;
}

export interface ImportSummary {
  imported: number;
  skipped: number;
  total: number;
}

export function importManualSystemsFromFile(filePath: string): ImportSummary {
  const raw = readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Geçersiz dosya formatı: JSON dizi bekleniyor.");
  }

  const existing = loadManualSystems();
  const existingKeys = new Set(existing.map(dedupeKey));
  let imported = 0;
  let skipped = 0;

  for (const item of parsed) {
    if (!item || typeof item !== "object" || !item.name || !item.systemId) {
      skipped++;
      continue;
    }
    const type = item.type === "cloud" ? "cloud" : "onprem";
    const trimmedAdtUrl = typeof item.adtUrl === "string" ? item.adtUrl.trim() : "";
    const candidate: ManualSystem = {
      id: randomUUID(),
      name: String(item.name).trim(),
      systemId: String(item.systemId).trim().toUpperCase(),
      type,
      host: typeof item.host === "string" && item.host.trim() ? item.host.trim() : null,
      diagPort: Number.isFinite(item.diagPort) ? item.diagPort : null,
      adtUrl: trimmedAdtUrl ? normalizeAdtBaseUrl(trimmedAdtUrl) : null,
      createdAt: new Date().toISOString()
    };
    const key = dedupeKey(candidate);
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }
    existingKeys.add(key);
    existing.push(candidate);
    imported++;
  }

  saveManualSystems(existing);
  return { imported, skipped, total: parsed.length };
}
