// Tur 10, madde 1: "lidere işi verdim, geliştiriciye atmıyor" / "Claude lider ekip kurmuyor".
// Ölçülen kök nedenler: (1) Claude Code'un Bash aracı (Git Bash) `ntt-team`i bulamıyor
// (yalnız .cmd/.ps1 vardı: "command not found"); (2) lider rehberi yalnız ilk Akış
// mesajında, Claude'a açılışta hiç verilmiyor; (3) özel komutlu (ör. Azure/Foundry
// başlatıcısı) lider hiç ajan açamıyordu ("Uygun motor yok").
import { describe, expect, it } from "vitest";
import {
  LEAD_REMINDER,
  LEAD_SYSTEM_PROMPT,
  agentHintFor,
  leadHint,
  pickSpawnEngine,
  workerCommand
} from "../app-electron/shared/leadCommands";
import { buildAgentCommand } from "../app-electron/shared/agentEngines";
import { TEAM_HINT, TEAM_SH } from "../app-electron/main/teamBridge";

describe("ntt-team Git Bash betiği", () => {
  it("uzantısız sh betiği ps1'i Windows yoluyla, yol dönüştürmesi kapalı çağırıyor", () => {
    expect(TEAM_SH.startsWith("#!/bin/sh\n")).toBe(true);
    expect(TEAM_SH).toContain("cygpath -w");
    expect(TEAM_SH).toContain("MSYS_NO_PATHCONV=1");
    expect(TEAM_SH).toContain('-File "$d/ntt-team.ps1" "$@"');
    expect(TEAM_SH).not.toContain("\r");
  });
});

describe("lider rehberi her lider mesajında", () => {
  it("lider: ilk mesajda tam rehber, sonrakilerde kısa hatırlatma", () => {
    const full = leadHint(4, true);
    expect(agentHintFor({ lead: true, first: true, teamSize: 1, max: 4, canSpawn: true, teamHint: TEAM_HINT })).toBe(full);
    expect(agentHintFor({ lead: true, first: false, teamSize: 3, max: 4, canSpawn: true, teamHint: TEAM_HINT })).toBe(LEAD_REMINDER);
    expect(LEAD_REMINDER.length).toBeLessThan(260);
    expect(LEAD_REMINDER).toContain("ntt-team assign");
    expect(LEAD_REMINDER).toContain("kendin yapma");
  });

  it("öteki ajan: ekip 2+ iken yalnız ilk mesajda ekip ipucu", () => {
    expect(agentHintFor({ lead: false, first: true, teamSize: 2, max: 4, canSpawn: true, teamHint: TEAM_HINT })).toBe(TEAM_HINT);
    expect(agentHintFor({ lead: false, first: true, teamSize: 1, max: 4, canSpawn: true, teamHint: TEAM_HINT })).toBe("");
    expect(agentHintFor({ lead: false, first: false, teamSize: 3, max: 4, canSpawn: true, teamHint: TEAM_HINT })).toBe("");
  });

  it("tam rehber: kendin yapma, önce boştaki ajana assign", () => {
    const full = leadHint(4, true);
    expect(full).toContain("kendin yapma");
    expect(full.indexOf("ntt-team status")).toBeLessThan(full.indexOf("ntt-team spawn"));
  });
});

describe("Claude lideri açılışta kimliğini alıyor", () => {
  it("lider Claude: --append-system-prompt ve ntt-team için izin", () => {
    const cmd = buildAgentCommand({ engine: "claude", role: "Lider", roleKind: "preset" }, "");
    expect(cmd).toBe(`claude --append-system-prompt "${LEAD_SYSTEM_PROMPT}" --allowedTools "Bash(ntt-team:*)"`);
  });

  it("öteki Claude ajanı: yalnız ntt-team izni; model bayrağı korunuyor", () => {
    expect(buildAgentCommand({ engine: "claude", role: "Geliştirici", roleKind: "preset", model: "sonnet" }, "")).toBe(
      'claude --allowedTools "Bash(ntt-team:*)" --model sonnet'
    );
  });

  it("lider açımı (spawnedBy) Lider olsa da lider istemi almıyor", () => {
    expect(buildAgentCommand({ engine: "claude", role: "Lider", roleKind: "preset", spawnedBy: "L" }, "")).not.toContain("--append-system-prompt");
  });

  it("öteki motorlar değişmiyor", () => {
    expect(buildAgentCommand({ engine: "codex", role: "Lider", roleKind: "preset" }, "")).toBe("codex");
    expect(buildAgentCommand({ engine: "axet-code", role: "Lider", roleKind: "preset" }, "")).toBe("axet-code -y");
  });

  it("sistem istemi kabukta tırnak içinde güvenli (cmd ve PowerShell özel karakteri yok)", () => {
    expect(LEAD_SYSTEM_PROMPT).not.toMatch(/["$`%&|<>^!\r\n]/);
    expect(LEAD_SYSTEM_PROMPT).toContain("ntt-team assign");
    expect(LEAD_SYSTEM_PROMPT.length).toBeLessThan(900);
  });
});

describe("özel komutlu lider", () => {
  it("motor belirtilmezse kendi komutuyla (eşit yetki) ajan açar", () => {
    expect(pickSpawnEngine("ozel", null, null)).toEqual({ ok: true, engine: "ozel" });
    expect(pickSpawnEngine("ozel", null, "axet-code")).toEqual({ ok: true, engine: "ozel" });
    expect(pickSpawnEngine("ozel", "ozel", null)).toEqual({ ok: true, engine: "ozel" });
  });

  it("onay soran motorları açabilir; -y'li axet-code'u açamaz", () => {
    expect(pickSpawnEngine("ozel", "claude", null)).toEqual({ ok: true, engine: "claude" });
    expect(pickSpawnEngine("ozel", "axet-code", null)).toMatchObject({ ok: false });
  });

  it("öteki liderler özel komutlu ajan açamaz (değişmedi)", () => {
    expect(pickSpawnEngine("axet-code", "ozel", null)).toMatchObject({ ok: false });
    expect(pickSpawnEngine("claude", null, "ozel")).toEqual({ ok: true, engine: "claude" });
  });

  it("işçi komutu liderin oturumunu sürdürmez (--continue/--resume atılıyor)", () => {
    expect(workerCommand("azure --continue")).toBe("azure");
    expect(workerCommand("claude -c --model opus")).toBe("claude --model opus");
    expect(workerCommand("azure --resume 0b1c2d3e-aaaa-bbbb-cccc-000000000000 --verbose")).toBe("azure --verbose");
    expect(workerCommand("azure -r abc")).toBe("azure");
    expect(workerCommand('"C:\\NTT DATA\\azure.bat" --continue')).toBe('"C:\\NTT DATA\\azure.bat"');
    expect(workerCommand("azure")).toBe("azure");
  });
});
