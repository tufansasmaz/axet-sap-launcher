// Lider (spec 2026-10-18 gorev-panosu §3): istem kurucu ve plan
// ayrıştırıcı. SAF. Bölmeyi yapay zekâ yapıyor; buradan sonrası kod.
// Cevaptaki ilk JSON nesnesi (```json bloğu önce) alınıyor ve şemadan
// geçiyor. Yapısal hata planı reddediyor; görünüm sınırları (başlık, rol)
// kırpılıyor: 85 karakterlik başlık bütün planı çöpe attırmamalı.
import { graphError } from "./boardLogic";
import { MAX_SUBTASKS, ROLE_HINT_MAX, SUBTASK_PROMPT_MAX, SUBTASK_TITLE_MAX, type LeadErrorCode } from "./boardTypes";

export interface PlannedSubtask {
  title: string;
  prompt: string;
  roleHint: string;
  /** Aynı listedeki alt görevlerin 0'dan başlayan indeksleri. */
  dependsOn: number[];
}

export type PlanResult = { ok: true; subtasks: PlannedSubtask[] } | { ok: false; error: LeadErrorCode };

/** `start`taki `{` ile dengelenen nesnenin bittiği yer (hariç); dengelenmiyorsa -1. */
function balancedEnd(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/** Cevaptaki ilk JSON nesnesinin metni: önce ``` bloğu, sonra düz metin. */
export function extractFirstJsonObject(text: string): string | null {
  const fence = /```(?:json)?[ \t]*\r?\n?([\s\S]*?)```/i.exec(text);
  const sources = fence ? [fence[1], text] : [text];
  for (const source of sources) {
    const start = source.indexOf("{");
    if (start < 0) continue;
    const end = balancedEnd(source, start);
    if (end > 0) return source.slice(start, end);
  }
  return null;
}

const fail = (error: LeadErrorCode): PlanResult => ({ ok: false, error });

export function parseLeadPlan(text: string): PlanResult {
  const json = extractFirstJsonObject(text);
  if (!json) return fail("noJson");
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return fail("badJson");
  }
  const list = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>).subtasks : undefined;
  if (!Array.isArray(list) || list.length === 0) return fail("noSubtasks");
  if (list.length > MAX_SUBTASKS) return fail("tooMany");
  const subtasks: PlannedSubtask[] = [];
  for (let i = 0; i < list.length; i += 1) {
    const raw: unknown = list[i];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail("badField");
    const record = raw as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    const prompt = typeof record.prompt === "string" ? record.prompt.trim() : "";
    if (!title || !prompt || prompt.length > SUBTASK_PROMPT_MAX) return fail("badField");
    if (record.role !== undefined && record.role !== null && typeof record.role !== "string") return fail("badField");
    const roleHint = typeof record.role === "string" ? record.role.trim().slice(0, ROLE_HINT_MAX).trim() : "";
    const rawDeps: unknown = record.dependsOn ?? [];
    if (!Array.isArray(rawDeps)) return fail("badDependency");
    const dependsOn: number[] = [];
    for (const dep of rawDeps as unknown[]) {
      if (typeof dep !== "number" || !Number.isInteger(dep) || dep < 0 || dep >= list.length || dep === i) return fail("badDependency");
      if (!dependsOn.includes(dep)) dependsOn.push(dep);
    }
    subtasks.push({ title: title.slice(0, SUBTASK_TITLE_MAX).trim(), prompt, roleHint, dependsOn });
  }
  const graph = graphError(subtasks.map((s, i) => ({ id: String(i), dependsOn: s.dependsOn.map(String) })));
  if (graph) return fail(graph);
  return { ok: true, subtasks };
}

/** Liderin istemi (spec §3): hedef + kurallar + alandaki roller. */
export function buildLeadPrompt(input: { title: string; goal: string; roles: readonly string[] }): string {
  const roles = [...new Set(input.roles.map((r) => r.trim()).filter(Boolean))];
  return [
    `Görev: ${input.title.trim()}`,
    "Hedef:",
    input.goal.trim(),
    "",
    `Alandaki ajanların rolleri: ${roles.length ? roles.join(", ") : "(rol tanımlı değil)"}`,
    "",
    "Kurallar:",
    "- Dosya DEĞİŞTİRME, yalnız oku ve planla.",
    '- Cevabın yalnız şu JSON olsun: {"subtasks":[{"title":"…","prompt":"…","role":"…","dependsOn":[0]}]}',
    `- En fazla ${MAX_SUBTASKS} alt görev. "dependsOn" aynı listedeki alt görevlerin 0'dan başlayan indeksleri; döngü olmasın.`,
    '- Her "prompt" tek başına anlaşılır olsun: ajan hedefi ve öteki alt görevleri görmüyor.',
    '- "role" yukarıdaki rollerden biri olsun ya da boş kalsın.',
    `- "title" en fazla ${SUBTASK_TITLE_MAX}, "prompt" en fazla ${SUBTASK_PROMPT_MAX} karakter.`
  ].join("\n");
}
