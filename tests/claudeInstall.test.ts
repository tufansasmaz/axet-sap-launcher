// Tur 10, madde 6: "Bilgisayarda Azure adıyla Claude yüklüydü ama 'kurulu değil' diyordu;
// kurdum, başlatınca geçmiş gitti ve logon istedi". Ölçüldü (bu makinede): Claude, kullanıcının
// PATH'teki başlatıcısıyla (azure.bat: CLAUDE_CODE_USE_FOUNDRY + ANTHROPIC_FOUNDRY_* ortamı,
// sonra %APPDATA%\npm\claude.cmd) çalışıyor; Foundry ayarı ne sistem ortamında ne
// ~/.claude/settings.json env'de var. Uygulamanın `claude` komutu bu ortamı almıyor → giriş ister.
import { describe, expect, it } from "vitest";
import { withToolDirs } from "../app-electron/main/toolPath";
import { claudeProviderConfigured, findClaudeLauncher, isClaudeLauncherScript } from "../app-electron/main/claudeInstall";
import { buildAgentCommand } from "../app-electron/shared/agentEngines";

const exists = (dirs: string[]) => (p: string) => dirs.includes(p);

describe("withToolDirs — Claude yerel kurulumu", () => {
  it("~/.local/bin (yerel kurulum) PATH'te yoksa npm'den ÖNCE ekleniyor", () => {
    const env = { APPDATA: "C:\\U\\AppData\\Roaming", USERPROFILE: "C:\\U" };
    const out = withToolDirs("C:\\Windows;C:\\U\\AppData\\Roaming\\npm", env, exists(["C:\\U\\.local\\bin", "C:\\U\\AppData\\Roaming\\npm"]));
    expect(out).toBe("C:\\Windows;C:\\U\\.local\\bin;C:\\U\\AppData\\Roaming\\npm");
  });

  it("npm de yoksa ikisi sırayla sona", () => {
    const env = { APPDATA: "C:\\U\\AppData\\Roaming", USERPROFILE: "C:\\U" };
    expect(withToolDirs("C:\\Windows", env, exists(["C:\\U\\.local\\bin", "C:\\U\\AppData\\Roaming\\npm"]))).toBe("C:\\Windows;C:\\U\\.local\\bin;C:\\U\\AppData\\Roaming\\npm");
  });
});

const BAT = [
  "@echo off",
  "set ANTHROPIC_FOUNDRY_RESOURCE=kaynak",
  "set ANTHROPIC_FOUNDRY_API_KEY=GIZLI",
  "set CLAUDE_CODE_USE_FOUNDRY=1",
  'set "CLAUDE_CMD=%APPDATA%\\npm\\claude.cmd"',
  '"%CLAUDE_CMD%" --dangerously-skip-permissions %*'
].join("\r\n");

describe("Claude başlatıcısı (Azure/Foundry/Bedrock/Vertex)", () => {
  it("sağlayıcı ortamı kurup claude'u çağıran betik başlatıcıdır", () => {
    expect(isClaudeLauncherScript(BAT)).toBe("foundry");
    expect(isClaudeLauncherScript("set CLAUDE_CODE_USE_BEDROCK=1\r\nclaude %*")).toBe("bedrock");
    expect(isClaudeLauncherScript("set CLAUDE_CODE_USE_FOUNDRY=1\r\necho yok")).toBeNull();
    expect(isClaudeLauncherScript("claude %*")).toBeNull();
  });

  it("PATH klasörlerindeki .bat/.cmd taranıyor; tek başlatıcı bulunuyor (içerik dönmüyor)", () => {
    const files: Record<string, string> = {
      "C:\\NTT\\azure.bat": BAT,
      "C:\\NTT\\diger.cmd": "@echo off\r\necho x",
      "C:\\Windows\\x.exe": "MZ"
    };
    const found = findClaudeLauncher(["C:\\NTT", "C:\\Windows", "C:\\Yok"], {
      list: (dir) => Object.keys(files).filter((f) => f.startsWith(dir + "\\")).map((f) => ({ path: f, size: files[f].length })),
      read: (file) => files[file] ?? null
    });
    expect(found).toEqual({ name: "azure", path: "C:\\NTT\\azure.bat", provider: "foundry" });
    expect(JSON.stringify(found)).not.toContain("GIZLI");
  });

  it("birden çok başlatıcı ya da hiç yoksa null", () => {
    const files: Record<string, string> = { "C:\\A\\azure.bat": BAT, "C:\\B\\claude-az.cmd": BAT };
    const port = {
      list: (dir: string) => Object.keys(files).filter((f) => f.startsWith(dir + "\\")).map((f) => ({ path: f, size: files[f].length })),
      read: (file: string) => files[file] ?? null
    };
    expect(findClaudeLauncher(["C:\\A", "C:\\B"], port)).toBeNull();
    expect(findClaudeLauncher(["C:\\C"], port)).toBeNull();
  });

  it("büyük dosya ve adı güvenli olmayan betik atlanıyor", () => {
    const files: Record<string, string> = { "C:\\A\\az ure.bat": BAT, "C:\\A\\big.bat": BAT + " ".repeat(40_000) };
    const port = {
      list: (dir: string) => Object.keys(files).filter((f) => f.startsWith(dir + "\\")).map((f) => ({ path: f, size: files[f].length })),
      read: (file: string) => files[file] ?? null
    };
    expect(findClaudeLauncher(["C:\\A"], port)).toBeNull();
  });

  it("sağlayıcı ayarı ortamda ya da settings.json env'de varsa başlatıcı gerekmez (yalnız adlara bakılıyor)", () => {
    expect(claudeProviderConfigured({ CLAUDE_CODE_USE_FOUNDRY: "1" }, null)).toBe(true);
    expect(claudeProviderConfigured({}, { env: { ANTHROPIC_API_KEY: "x" } })).toBe(true);
    expect(claudeProviderConfigured({}, { env: { ANTHROPIC_MODEL: "claude-opus-5" } })).toBe(false);
    expect(claudeProviderConfigured({}, null)).toBe(false);
  });

  it("Claude ajanı başlatıcıyla açılıyor (bayraklar korunur)", () => {
    expect(buildAgentCommand({ engine: "claude", role: "Geliştirici", roleKind: "preset", model: "opus" }, "", { claudeBase: "azure" })).toBe(
      'azure --allowedTools "Bash(ntt-team:*)" --model opus'
    );
    // güvensiz ad komuta girmiyor
    expect(buildAgentCommand({ engine: "claude", role: "x", roleKind: "custom" }, "", { claudeBase: "az & calc" })).toMatch(/^claude /);
  });
});
