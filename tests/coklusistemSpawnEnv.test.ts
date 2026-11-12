// Çoklu sistem: ajan/sohbet süreci KENDİ klasörünün sisteminin adresini ve
// jetonunu alıyor; başka sistemin jetonu ortama sızmıyor.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../app-electron/main/i18n", () => ({ mt: (key: string) => key }));

const { axetSpawnEnv } = await import("../app-electron/main/axetSpawnEnv");
const { resetSystemsForTest, setSystemAdtPort, upsertSystem, focusSystem } = await import("../app-electron/main/sapSystems");

const ident = (sid: string, tier: "DEV" | "PRD") => ({ uuid: sid, systemId: sid, client: "100", user: "U", tier });

beforeEach(() => resetSystemsForTest());

describe("axetSpawnEnv(cwd)", () => {
  it("DEV klasöründeki süreç DEV'in, PRD klasöründeki PRD'nin adres + jetonunu alıyor", () => {
    const dev = upsertSystem("C:\\proj\\DEV", ident("DEV", "DEV"));
    setSystemAdtPort(dev.projectDir, 8787);
    const prd = upsertSystem("C:\\proj\\PRD", ident("PRD", "PRD"));
    setSystemAdtPort(prd.projectDir, 8800);
    const envDev = axetSpawnEnv(false, "C:\\proj\\DEV");
    const envPrd = axetSpawnEnv(true, "C:\\proj\\PRD\\alt");
    expect(envDev.ABAP_HTTP_TOKEN).toBe(dev.token);
    expect(envDev.ABAP_HTTP_URL).toBe("http://127.0.0.1:8787");
    expect(envPrd.ABAP_HTTP_TOKEN).toBe(prd.token);
    expect(envPrd.ABAP_HTTP_PORT).toBe("8800");
    expect(JSON.stringify(envPrd)).not.toContain(dev.token);
  });

  it("klasörü sisteme ait olmayan süreç odaktaki sistemi alıyor (tek sistemde bugünkü davranış)", () => {
    const a = upsertSystem("C:\\proj\\A", ident("A", "DEV"));
    setSystemAdtPort(a.projectDir, 8787);
    upsertSystem("C:\\proj\\B", ident("B", "PRD"));
    setSystemAdtPort("C:\\proj\\B", 8801);
    focusSystem("C:\\proj\\A");
    expect(axetSpawnEnv(false, "C:\\genel").ABAP_HTTP_TOKEN).toBe(a.token);
  });
});
