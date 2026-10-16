// Destek paketinin içeriği (spec 2026-10-16 §4). Electron'a dokunmuyor;
// kaynakları çağıran veriyor (bkz. support/ipc.ts). Yasaklı dosyalar
// (.conn_adt, config.json, SAML çerezleri, axet-code.db, ekler,
// sap-context.md) burada adıyla bile geçmiyor: aday listesi yalnız izinlileri
// sayıyor.

import { closeSync, existsSync, fstatSync, openSync, readSync } from "node:fs";
import path from "node:path";
import type { ChatSessionsState } from "../../shared/types";
import { addCounts, redact } from "./redact";
import type { ZipEntry } from "./zipWriter";

export const MAX_LOG_BYTES = 2 * 1024 * 1024;
const MAX_NOTE = 4000;

export interface BundleSources {
  appLogPath: string;
  projectDir: string | null;
  chatState: ChatSessionsState;
  info: Record<string, unknown>;
  secrets: readonly string[];
}

export interface BundleRequest {
  note: string;
  chatMarkdown: string | null;
}

interface Candidate {
  name: string;
  path: string;
  /** Yoksa `bilgi.json`'da eksik diye yazılsın mı (`.1` yedeği olmayabilir, olağan). */
  expected: boolean;
}

function candidates(src: Pick<BundleSources, "appLogPath" | "projectDir">): Candidate[] {
  const list: Candidate[] = [
    { name: "ntt-studio.log", path: src.appLogPath, expected: true },
    { name: "ntt-studio.log.1", path: `${src.appLogPath}.1`, expected: false }
  ];
  if (src.projectDir) {
    list.push({ name: "axet-code.log", path: path.join(src.projectDir, ".axet-code", "logs", "axet-code.log"), expected: true });
    list.push({ name: "adt-sunucu.log", path: path.join(src.projectDir, "adt-readonly.log"), expected: true });
  }
  return list;
}

/** Dosyanın son `max` baytı; kesildiyse yarım ilk satır atılıyor (yarım bir anahtar maskeden kaçmasın). */
export function readTail(file: string, max = MAX_LOG_BYTES): string {
  const fd = openSync(file, "r");
  try {
    const size = fstatSync(fd).size;
    const start = Math.max(0, size - max);
    const buf = Buffer.alloc(size - start);
    readSync(fd, buf, 0, buf.length, start);
    const text = buf.toString("utf-8");
    if (start === 0) return text;
    const nl = text.indexOf("\n");
    return nl >= 0 ? text.slice(nl + 1) : "";
  } finally {
    closeSync(fd);
  }
}

/** Sohbetlerin zaman çizelgesi: metin, başlık ve araç hedefi YOK. */
export function chatTimings(state: ChatSessionsState): unknown[] {
  return state.sessions.map((s) => ({
    id: s.id,
    titleLength: s.title.length,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    model: s.model ? `${s.model.provider}/${s.model.model}` : null,
    messages: s.messages.map((m) => ({
      role: m.role,
      createdAt: m.createdAt,
      length: m.content.length,
      ...(m.error ? { error: true } : {}),
      ...(m.interrupted ? { interrupted: true } : {}),
      attachments: m.attachments?.length ?? 0,
      tools: (m.steps ?? []).map((st) => st.tool).filter((t): t is string => typeof t === "string" && t.length > 0)
    }))
  }));
}

export function bundleFileNames(src: Pick<BundleSources, "appLogPath" | "projectDir">, req: BundleRequest): string[] {
  return [
    "bilgi.json",
    ...candidates(src).filter((c) => existsSync(c.path)).map((c) => c.name),
    "sohbet-zamanlari.json",
    ...(req.chatMarkdown ? ["sohbet.md"] : []),
    ...(req.note.trim() ? ["not.txt"] : [])
  ];
}

export function buildBundleEntries(
  src: BundleSources,
  req: BundleRequest
): { entries: ZipEntry[]; redactions: Record<string, number> } {
  const redactions: Record<string, number> = {};
  const clean = (text: string): string => {
    const r = redact(text, src.secrets);
    addCounts(redactions, r.counts);
    return r.text;
  };
  const utf8 = (s: string) => Buffer.from(s, "utf-8");

  const entries: ZipEntry[] = [];
  const missing: string[] = [];
  if (!src.projectDir) missing.push("proje günlükleri (bağlı sistem yok)");
  for (const c of candidates(src)) {
    if (!existsSync(c.path)) {
      if (c.expected) missing.push(c.name);
      continue;
    }
    entries.push({ name: c.name, data: utf8(clean(readTail(c.path))) });
  }
  entries.push({ name: "sohbet-zamanlari.json", data: utf8(JSON.stringify(chatTimings(src.chatState), null, 2)) });
  if (req.chatMarkdown) entries.push({ name: "sohbet.md", data: utf8(clean(req.chatMarkdown)) });
  const note = req.note.trim().slice(0, MAX_NOTE);
  if (note) entries.push({ name: "not.txt", data: utf8(clean(note)) });

  // En son: maskeleme sayıları öteki dosyaların hepsini kapsasın.
  const info = clean(JSON.stringify({ ...src.info, eksik: missing, maskeleme: { ...redactions } }, null, 2));
  entries.unshift({ name: "bilgi.json", data: utf8(info) });
  return { entries, redactions };
}
