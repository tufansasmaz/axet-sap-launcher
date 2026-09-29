// Kenar çubuğundaki sohbet ağacı KAPALI açılıyor. Açık gelen ağaç bütün
// sohbetleri bir anda döküyordu; kullanıcı yalnızca başlıkları görmek istedi.
// Bileşen Electron'a bağlı olduğu için davranış burada kaynaktan kilitleniyor.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (...parts: string[]) =>
  readFileSync(path.join(__dirname, "..", "src", ...parts), "utf8").replace(/\r\n/g, "\n");
const src = read("components", "ChatSidebar.tsx");
// Açık gruplar ve etkin sohbetin yolunu açan etki store'da: kenar çubuğu mod
// değişince unmount oluyor, durum dönüşte yerinde kalsın diye.
const storeSrc = read("stores", "chatStore.tsx");

describe("sohbet ağacı — varsayılan kapalı", () => {
  it("açık gruplar tutuluyor, başlangıç durumu boş", () => {
    expect(storeSrc).toContain(
      "const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});",
    );
    expect(src).not.toContain("collapsedGroups");
    expect(storeSrc).not.toContain("collapsedGroups");
  });

  it("grup yalnızca açılmışsa ya da arama varsa açık", () => {
    expect(src).toContain(
      "Boolean(normalizedQuery) || Boolean(openGroups[key]);",
    );
  });

  it("etkin sohbetin yolu, etkin sohbet değişince açılıyor", () => {
    const effect = storeSrc.slice(storeSrc.indexOf("const s = activeSession;"));
    const body = effect.slice(0, effect.indexOf("}, [activeSession?.id]);"));
    expect(body.length).toBeGreaterThan(0);
    expect(body).toContain("activeGroupKeys(");
  });
});
