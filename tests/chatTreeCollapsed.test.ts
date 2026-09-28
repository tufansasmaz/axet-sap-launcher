// Kenar çubuğundaki sohbet ağacı KAPALI açılıyor. Açık gelen ağaç bütün
// sohbetleri bir anda döküyordu; kullanıcı yalnızca başlıkları görmek istedi.
// Bileşen Electron'a bağlı olduğu için davranış burada kaynaktan kilitleniyor.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(
  path.join(__dirname, "..", "src", "components", "AxetCodeHome.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("sohbet ağacı — varsayılan kapalı", () => {
  it("açık gruplar tutuluyor, başlangıç durumu boş", () => {
    expect(src).toContain(
      "const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});",
    );
    expect(src).not.toContain("collapsedGroups");
  });

  it("grup yalnızca açılmışsa ya da arama varsa açık", () => {
    expect(src).toContain(
      "Boolean(normalizedQuery) || Boolean(openGroups[key]);",
    );
  });

  it("etkin sohbetin yolu, etkin sohbet değişince açılıyor", () => {
    const effect = src.slice(src.indexOf("const s = activeSession;"));
    const body = effect.slice(0, effect.indexOf("}, [activeSession?.id]);"));
    expect(body.length).toBeGreaterThan(0);
    for (const key of ["PROJECTS_SECTION_KEY", "GENERAL_GROUP_KEY", "SAP_SECTION_KEY"]) {
      expect(body).toContain(key);
    }
  });
});
