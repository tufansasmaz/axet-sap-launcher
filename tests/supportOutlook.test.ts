// Outlook taslağı (spec 2026-10-16 §7): değerler ortamda, komut satırında
// değil; başarısızlıkta ve takılmada klasöre düşüş.
import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { OUTLOOK_SCRIPT, deliverBundle, openOutlookDraft, type DraftMail } from "../app-electron/main/support/outlookDraft";

const MAIL: DraftMail = {
  to: "destek@example.test",
  subject: "NTT Studio sorun bildirimi — 1.8.3 — D01 (DEV)",
  body: "Ek'teki paket… \"tırnak\" ve $(Get-Date)",
  attachment: "C:\\Users\\x\\Documents\\NTT Studio Destek\\p.zip"
};

function fakeSpawn(behave: "ok" | "fail" | "error" | "hang") {
  const calls: { cmd: string; args: string[]; env: NodeJS.ProcessEnv }[] = [];
  const kill = vi.fn();
  const impl = (cmd: string, args: string[], opts: { env: NodeJS.ProcessEnv }) => {
    calls.push({ cmd, args, env: opts.env });
    const child = Object.assign(new EventEmitter(), { kill });
    setTimeout(() => {
      if (behave === "ok") child.emit("exit", 0);
      if (behave === "fail") child.emit("exit", 1);
      if (behave === "error") child.emit("error", new Error("ENOENT"));
    }, 5);
    return child;
  };
  return { impl, calls, kill };
}

describe("openOutlookDraft", () => {
  it("değerler ortamda; komut satırında ne adres ne konu ne gövde var", async () => {
    const f = fakeSpawn("ok");
    expect(await openOutlookDraft(MAIL, f.impl as never)).toBe(true);
    const { cmd, args, env } = f.calls[0];
    expect(cmd.toLowerCase()).toContain("powershell");
    expect(args).toContain(OUTLOOK_SCRIPT);
    expect(args.join(" ")).not.toContain("destek@example.test");
    expect(args.join(" ")).not.toContain("Get-Date");
    expect(env.NTT_MAIL_TO).toBe(MAIL.to);
    expect(env.NTT_MAIL_SUBJECT).toBe(MAIL.subject);
    expect(env.NTT_MAIL_BODY).toBe(MAIL.body);
    expect(env.NTT_MAIL_ATTACHMENT).toBe(MAIL.attachment);
  });

  it("çıkış kodu 0 değilse ya da başlatılamazsa false", async () => {
    expect(await openOutlookDraft(MAIL, fakeSpawn("fail").impl as never)).toBe(false);
    expect(await openOutlookDraft(MAIL, fakeSpawn("error").impl as never)).toBe(false);
  });

  it("takılırsa zaman aşımında öldürülüp false (inceleme odağı 4)", async () => {
    const f = fakeSpawn("hang");
    expect(await openOutlookDraft(MAIL, f.impl as never, 30)).toBe(false);
    expect(f.kill).toHaveBeenCalled();
  });
});

describe("deliverBundle", () => {
  it("Outlook açılırsa outlook; açılmazsa klasör gösteriliyor", async () => {
    const showInFolder = vi.fn();
    expect(await deliverBundle(MAIL, { openDraft: async () => true, showInFolder })).toBe("outlook");
    expect(showInFolder).not.toHaveBeenCalled();
    expect(await deliverBundle(MAIL, { openDraft: async () => false, showInFolder })).toBe("folder");
    expect(showInFolder).toHaveBeenCalledWith(MAIL.attachment);
  });
});
