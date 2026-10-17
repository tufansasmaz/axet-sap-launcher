// Görev panosunun SAF dağıtıcısı (spec 2026-10-18 gorev-panosu §5, §6).
// Yazmıyor; yalnız "hangi alt görev hangi ajana" diyor. Yazma ana süreçte
// izleyicinin `sendPrompt`'unda ve orada yeniden denetleniyor. Motor
// çalışmıyorsa (kabuk istemi ekranda) ajan HİÇBİR modda uygun değil: yapay
// zekâ metni asla cmd/PowerShell komutu olarak çalışmamalı.
import type { AgentStatus } from "./agentTypes";
import { isActiveSubtask } from "./boardLogic";
import { SUBTASK_PROMPT_MAX, type BoardTask, type Proof } from "./boardTypes";

export interface AgentInfo {
  paneId: string;
  workspaceId: string;
  role: string;
  status: AgentStatus | null;
  /** Kullanıcı o bölmede yazmıyor: Enter'a basılmamış taslak yok, son tuş TYPING_GUARD_MS'den eski. */
  inputIdle: boolean;
}

export type AssignMode = "auto" | "manual";

export interface Dispatch {
  taskId: string;
  subtaskId: string;
  paneId: string;
}

/** 2. koşul: kayıtlı, durumu biliniyor ve motor kapanmamış (`finished` = kabuk istemi geri döndü). */
export function engineRunning(agent: AgentInfo): boolean {
  return agent.status !== null && agent.status.state !== "finished";
}

/** 4. koşul: başka bir alt görevin üstünde çalışan/doğrulanan ajanlar. */
export function busyPanes(tasks: readonly BoardTask[]): Set<string> {
  const out = new Set<string>();
  for (const task of tasks) {
    for (const s of task.subtasks) if (s.paneId && isActiveSubtask(s)) out.add(s.paneId);
  }
  return out;
}

/** 2–5. koşullar. Kendiliğinden dağıtımda tahmini "boşta" yalnız başlangıçtaki (lastActivity yok) hâl. */
export function agentEligible(agent: AgentInfo, busy: ReadonlySet<string>, mode: AssignMode): boolean {
  if (!engineRunning(agent) || !agent.inputIdle || busy.has(agent.paneId)) return false;
  const status = agent.status as AgentStatus;
  if (status.state !== "idle") return false;
  return mode === "manual" || status.source === "exact" || status.lastActivity === null;
}

/** Rol karşılaştırması: büyük/küçük harf ve Türkçe İ/ı duyarsız. */
export function foldRole(role: string): string {
  return role.trim().toLocaleLowerCase("tr-TR").replace(/ı/g, "i");
}

/** Kendiliğinden dağıtım turu: eski görev önce, her ajana en fazla bir alt görev. */
export function planDispatch(tasks: readonly BoardTask[], workspaceId: string, agents: readonly AgentInfo[]): Dispatch[] {
  const busy = busyPanes(tasks);
  const used = new Set<string>();
  const pool = agents.filter((a) => a.workspaceId === workspaceId);
  const out: Dispatch[] = [];
  const ordered = tasks.filter((t) => t.approvedAt !== undefined).sort((a, b) => a.createdAt - b.createdAt);
  for (const task of ordered) {
    for (const sub of task.subtasks) {
      if (sub.state !== "ready" || sub.held) continue;
      const eligible = pool.filter((a) => !used.has(a.paneId) && agentEligible(a, busy, "auto"));
      if (eligible.length === 0) return out;
      const hint = foldRole(sub.roleHint);
      const pick = (hint ? eligible.find((a) => foldRole(a.role) === hint) : undefined) ?? eligible[0];
      used.add(pick.paneId);
      out.push({ taskId: task.id, subtaskId: sub.id, paneId: pick.paneId });
    }
  }
  return out;
}

/** Ajana yazılacak tek satır: satır sonu ve denetim karakteri yok, ≤ 4000. `\r` yazan izleyici. */
export function toPromptLine(text: string): string {
  return text
    .replace(/[\u0000-\u001f\u007f-\u009f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SUBTASK_PROMPT_MAX);
}

/** "Düzeltmeye geri gönder" istemi (spec §6): ilk kırmızı komut ve çıktısının sonu. */
export function sendBackPrompt(proof: Proof): string | null {
  const failed = proof.commands.find((c) => c.timedOut || c.error !== undefined || c.exitCode !== 0);
  if (!failed) return null;
  const head = `Doğrulama başarısız: ${toPromptLine(failed.command)} çıktısının sonu: `;
  const end = " Düzelt.";
  const room = Math.max(0, SUBTASK_PROMPT_MAX - head.length - end.length);
  const tail = toPromptLine(failed.tail);
  return toPromptLine(`${head}${room > 0 ? tail.slice(-room) : ""}${end}`);
}
