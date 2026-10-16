// Destek paketini Outlook taslağına ek olarak koymak (spec 2026-10-16 §7).
// Outlook COM'u PowerShell'den. Adres, konu, gövde ve dosya yolu ORTAMDAN
// okunuyor: komut sabit; kullanıcı metni (not, sistem adı) tırnak ya da `$(…)`
// içerse bile komut olarak çalışmıyor. Outlook yoksa, hata verirse ya da
// takılırsa çağıran klasörü gösteriyor.

import { spawn } from "node:child_process";

export interface DraftMail {
  to: string;
  subject: string;
  body: string;
  attachment: string;
}

export const DRAFT_TIMEOUT_MS = 20_000;

export const OUTLOOK_SCRIPT = [
  "$ErrorActionPreference = 'Stop'",
  "$o = New-Object -ComObject Outlook.Application",
  "$m = $o.CreateItem(0)",
  "if ($env:NTT_MAIL_TO) { $m.To = $env:NTT_MAIL_TO }",
  "$m.Subject = $env:NTT_MAIL_SUBJECT",
  "$m.Body = $env:NTT_MAIL_BODY",
  "[void]$m.Attachments.Add($env:NTT_MAIL_ATTACHMENT)",
  "$m.Display()"
].join("; ");

type ChildLike = {
  on(event: "exit", cb: (code: number | null) => void): unknown;
  on(event: "error", cb: (err: Error) => void): unknown;
  kill(): unknown;
};
export type SpawnLike = (cmd: string, args: string[], opts: { env: NodeJS.ProcessEnv; windowsHide: boolean }) => ChildLike;

/** "timeout" ayrı: Outlook'ta bir güvenlik sorusu açık kalmış olabilir, kullanıcıya söyleniyor. */
export type DraftOutcome = "opened" | "failed" | "timeout";

export function openOutlookDraft(
  mail: DraftMail,
  spawnImpl: SpawnLike = spawn as unknown as SpawnLike,
  timeoutMs = DRAFT_TIMEOUT_MS
): Promise<DraftOutcome> {
  return new Promise((resolve) => {
    let done = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = (outcome: DraftOutcome) => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      resolve(outcome);
    };
    let child: ChildLike;
    try {
      child = spawnImpl("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", OUTLOOK_SCRIPT], {
        env: {
          ...process.env,
          NTT_MAIL_TO: mail.to,
          NTT_MAIL_SUBJECT: mail.subject,
          NTT_MAIL_BODY: mail.body,
          NTT_MAIL_ATTACHMENT: mail.attachment
        },
        windowsHide: true
      });
    } catch {
      finish("failed");
      return;
    }
    timer = setTimeout(() => {
      try {
        child.kill();
      } catch {
        // zaten bitmiş olabilir
      }
      finish("timeout");
    }, timeoutMs);
    child.on("exit", (code) => finish(code === 0 ? "opened" : "failed"));
    child.on("error", () => finish("failed"));
  });
}

export async function deliverBundle(
  mail: DraftMail,
  deps: { openDraft: (m: DraftMail) => Promise<DraftOutcome>; showInFolder: (p: string) => void }
): Promise<{ draft: "outlook" | "folder"; outlookTimedOut: boolean }> {
  const outcome = await deps.openDraft(mail);
  if (outcome === "opened") return { draft: "outlook", outlookTimedOut: false };
  deps.showInFolder(mail.attachment);
  return { draft: "folder", outlookTimedOut: outcome === "timeout" };
}
