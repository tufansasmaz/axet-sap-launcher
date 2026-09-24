// SAP DEV yazma onayı — kablolama ve ajana giden talimatlar. Senkron ya da bir
// yeniden yazım silerse bu test kırılsın.
//
// Onay kapısı üç parçadan oluşuyor ve hiçbiri tek başına yetmiyor: launcher'ın
// onay ucu (sapWrite/server.ts), 8787'deki onaylı sunucu (adt_gated_server.py)
// ve abapGit script'lerinin kapısı (tier_gate.py). Ajan kapıyı yalnızca bir
// hata kodu olarak görüyor; ne yapacağını bilmezse `approval_pending`'i arıza
// sanıp başka yoldan yazmayı dener. O yüzden talimatların varlığı da burada
// kilitleniyor. Davranış Python testlerinde (`py -3`) ölçülüyor; CI'da Python
// olmadığı için burada statik kontrol ediliyor.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..");
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), "utf8").replace(/\r\n/g, "\n");

const SKILLS = ["resources", "sap-toolkit", "sap-consultant", "skills"];
const launcher = read("app-electron", "main", "launcher.ts");
const manager = read("app-electron", "main", "adtReadonlyServerManager.ts");
const gated = read(...SKILLS, "sap-adt", "scripts", "adt_gated_server.py");
const tierGate = read("resources", "sap-toolkit", "sapgui-scriptter", "skills", "abapgit-deploy", "scripts", "tier_gate.py");

describe("kablolama — DEV'de açılan sunucu onaylı sunucu", () => {
  it("adtServerScriptFor DEV'de adt_gated_server.py'yi açıyor, motoru doğrudan açmıyor", () => {
    const fn = launcher.slice(launcher.indexOf("function adtServerScriptFor("));
    const body = fn.slice(0, fn.indexOf("\n}\n"));
    expect(body).toContain('"adt_gated_server.py"');
    expect(body).not.toContain("adt_mcp_server.py");
    expect(body).toContain("53 araç");
    expect(body).toContain("(19 araç)");
  });

  it("onay ucunun adresi ve token'ı yalnızca onaylı sunucunun ortamına gidiyor", () => {
    expect(manager).toContain("env.ADT_APPROVAL_URL =");
    expect(manager).toContain("env.ADT_APPROVAL_TOKEN =");
    expect(gated).toContain('os.environ.get("ADT_APPROVAL_URL"');
    expect(gated).toContain('os.environ.get("ADT_APPROVAL_TOKEN"');
    // sap-context.md launcher'da üretiliyor; token oraya sızmasın.
    expect(launcher).not.toContain("ADT_APPROVAL_TOKEN");
    // abapGit script'leri launcher'a doğrudan gitmiyor, 8787'deki sunucuya soruyor.
    expect(tierGate).toContain('"/tool/axet_abapgit_onay"');
    expect(tierGate).not.toMatch(/ADT_APPROVAL_(URL|TOKEN)/);
  });

  it("/health sayısı yüzeyle uyuşmazsa beklenen 53 / 19", () => {
    expect(manager).toContain('expected: opts.expectWritable ? "53" : "19"');
  });

  it("hiçbir yerde eski 33 / 17 / 13 araç sayısı kalmadı", () => {
    const files = [
      launcher,
      manager,
      read("app-electron", "main", "sapToolkit.ts"),
      read("app-electron", "main", "skillProfiles.ts"),
      read("resources", "sap-toolkit", "CLAUDE.md"),
      read(...SKILLS, "sap-adt", "SKILL.md"),
      read(...SKILLS, "sap-adt-readonly", "SKILL.md")
    ];
    for (const src of files) {
      expect(src).not.toMatch(/\b(33|17|13) (araç|tool)|\b(33|17) araçlık|yazan 13|all 33|— 33 tools|engine's 33/);
    }
  });
});

describe("sap-context.md — DEV'de ajana onay akışı anlatılıyor", () => {
  const dev = launcher.slice(launcher.indexOf("function buildContextMarkdown("));

  it.each([
    "approval_pending",
    "approval_denied",
    "approval_unavailable",
    "yerel_mod",
    "axet_teslim",
    "%abap-code-review",
    "axet_inceleme_kaydet",
    "kritik_bulgu",
    "transport_belirsiz",
    "source_file"
  ])("%s geçiyor", (needle) => {
    expect(dev).toContain(needle);
  });

  it("approval_pending'de aynı çağrı aynı argümanlarla tekrarlanıyor (MCP ve abapGit ayrı ayrı)", () => {
    // İkisi de `approval_pending` geçiyor; biri silinince öteki testi yeşil tutmasın.
    expect(dev).toContain("**AYNI çağrıyı AYNI argümanlarla** tekrar gönder");
    expect(dev).toContain("\\`approval_pending:\\` satırı ve çıkış kodu 3");
  });

  it("DEV'de sunucuyu elle başlatma deniyor (onay ortamı olmadan her yazma reddedilir)", () => {
    expect(dev).toContain("DEV'de sunucuyu ELLE BAŞLATMA");
  });

  it("adt-tool.ps1 DEV'de yazma için kullanılmıyor", () => {
    // Kaynakta şablon dizesi içinde: ters tırnaklar kaçışlı.
    expect(dev).toContain("\\`adt-tool.ps1\\` ile SAP'a YAZMA");
  });
});

describe("SKILL.md — onay blokları", () => {
  const sapAdt = read(...SKILLS, "sap-adt", "SKILL.md");
  const deploy = read("resources", "sap-toolkit", "sapgui-scriptter", "skills", "abapgit-deploy", "SKILL.md");
  const review = read(...SKILLS, "abap-code-review", "SKILL.md");

  it("sap-adt: onay akışı, source_file, dolanma yasağı, 53/19", () => {
    expect(sapAdt).toContain("NTT Studio uyarlaması — SAP DEV yazma onayı");
    for (const s of ["approval_pending", "approval_denied", "yerel_mod", "axet_teslim", "source_file", "kritik_bulgu"]) {
      expect(sapAdt).toContain(s);
    }
    expect(sapAdt).toContain("DEV'de 53 araç");
    expect(sapAdt).toContain("diğer sistemlerde 19");
  });

  it("abapgit-deploy: exit 3 + approval_pending tekrar yazdırılıyor, exit 2 + GR_APPROVAL duruyor", () => {
    expect(deploy).toContain("NTT Studio uyarlaması — SAP DEV yazma onayı");
    // Üstteki blok ve döngünün çıkış listesi ayrı ayrı: biri kaybolursa ajan
    // döngüdeyken bekleyen onayı arıza sanıyor.
    expect(deploy).toContain("> - Çıktıda `approval_pending:` satırı ve **çıkış kodu 3**");
    expect(deploy).toContain("> - `REFUSED [GR_APPROVAL]` ve **çıkış kodu 2**");
    expect(deploy).toContain("**Exit 3 with an `approval_pending:` line**");
    expect(deploy).toContain("**Exit 2 with `REFUSED [GR_APPROVAL]`**");
    expect(deploy).toContain('tip="functiongroup"');
  });

  it("abap-code-review: inceleme axet_inceleme_kaydet ile kaydediliyor, token ortamdan", () => {
    expect(review).toContain("/tool/axet_inceleme_kaydet");
    expect(review).toContain("os.environ['ABAP_HTTP_TOKEN']");
    for (const s of ["kaynak_dosyalari", "bulgular", '"kritik"', "functiongroup"]) {
      expect(review).toContain(s);
    }
  });
});

describe("CLAUDE.md — uyarlama tablosu", () => {
  const claude = read("resources", "sap-toolkit", "CLAUDE.md");

  it.each([
    "adt_gated_server.py",
    "gated_collect.py",
    "gated_quality.py",
    "tier_gate.py",
    "test_tier_gate_approval.py",
    "abap-code-review/SKILL.md",
    "abapgit-deploy/SKILL.md"
  ])("%s satırı var", (file) => {
    const table = claude.slice(claude.indexOf("| Dosya | Ne degistirildi | Neden |"));
    expect(table).toContain(file);
  });

  it("dördüncü kapı: NTT Studio onayı", () => {
    expect(claude).toContain("NTT Studio write approval");
  });
});
