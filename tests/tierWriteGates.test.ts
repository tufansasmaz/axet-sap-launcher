// Yazma anındaki DEV kapıları — senkron silerse bu test kırılsın.
//
// Kullanıcı kararı (2026-09-23): yazma skill'leri (`screen-gen`, `adobe-gen`,
// `abapgit-deploy`) teknik danışmana HER sistemde kuruluyor; SAP'a yazma
// yalnızca `.conn_adt`'ı `ADT_SAP_TIER=DEV` olan sistemde açık. Kurulumda kapı
// kalmadığı için tek güvence bu skill'lerin kendi kodundaki kapı.
//
// Bu dosyalar NTT kataloğundan eşitlenen VENDOR kodu: bir sonraki senkron
// yerel uyarlamaları sessizce ezebilir (6c6909a'da 11 SKILL.md uyarlaması
// böyle kaybolup geri getirildi). Kapı kaybolursa QA/PRD'de ekran üretmek,
// Adobe formu yazmak ya da abapGit deploy etmek yeniden mümkün olur — ve hiçbir
// ekran bunu göstermez. O yüzden kapının VARLIĞI ve YAZMADAN ÖNCE çalıştığı
// burada kaynak üzerinden kilitleniyor.
//
// Davranış (QA/PRD/işaretsiz/`.conn_adt` yok → ret; DEV/SANDBOX → geçer)
// 2026-09-23'te `py` ile gerçek fonksiyonlar çağrılarak ölçüldü; CI'da Python
// olmadığı için burada statik kontrol ediliyor.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const TOOLKIT = path.join(__dirname, "..", "resources", "sap-toolkit");
const read = (...parts: string[]) => readFileSync(path.join(TOOLKIT, ...parts), "utf8").replace(/\r\n/g, "\n");

/** `def name(` ile bir sonraki üst düzey `def` arasındaki gövde. */
function pyFunction(source: string, name: string): string {
  const start = source.indexOf(`\ndef ${name}(`);
  expect(start, `def ${name}`).toBeGreaterThanOrEqual(0);
  const next = source.indexOf("\ndef ", start + 1);
  return source.slice(start, next < 0 ? undefined : next);
}

/** Kapı çağrısı, SAP'a giden ilk satırdan ÖNCE mi? */
function gateBefore(body: string, gate: string, firstSapCall: string): void {
  const g = body.indexOf(gate);
  const s = body.indexOf(firstSapCall);
  expect(g, `${gate} yok`).toBeGreaterThanOrEqual(0);
  expect(s, `${firstSapCall} yok`).toBeGreaterThanOrEqual(0);
  expect(g, `${gate}, ${firstSapCall}'dan sonra`).toBeLessThan(s);
}

describe("screen-gen / adobe-gen — kütüphane fonksiyonunda DEV kapısı", () => {
  // Kapı CLI'da değil kütüphanede: motorun `adt_generate_screen` /
  // `adt_generate_adobe` araçları bu fonksiyonları `require_writable` OLMADAN
  // çağırıyor. İkisini birden kapsayan tek yer burası.
  const screen = read("sap-consultant", "skills", "screen-gen", "scripts", "generate_screen.py");
  const adobe = read("sap-consultant", "skills", "adobe-gen", "scripts", "generate_adobe.py");

  it("_tier_refusal motorun require_writable'ını çağırıyor ve import hatasında REDDEDİYOR", () => {
    for (const [label, src] of [["screen", screen], ["adobe", adobe]] as const) {
      const helper = pyFunction(src, "_tier_refusal");
      expect(helper, label).toContain("AXET-TIER-GATE");
      expect(helper, label).toContain("require_writable(");
      // Fail-closed: guardrails yüklenemezse "bilinmiyor" = ret, geçiş değil.
      expect(helper, label).toMatch(/except ImportError[\s\S]*?"ok": False[\s\S]*?GR_TIER/);
    }
  });

  it("generate_screen, generate_fields, add_toolbar_button SAP'a gitmeden önce kapıdan geçiyor", () => {
    for (const fn of ["generate_screen", "generate_fields", "add_toolbar_button"]) {
      gateBefore(pyFunction(screen, fn), "_tier_refusal(", "_build_envelope(");
    }
  });

  it("generate_adobe SAP'a gitmeden önce kapıdan geçiyor", () => {
    gateBefore(pyFunction(adobe, "generate_adobe"), "_tier_refusal(", "adt.session.post(");
  });

  it("üretici FM'in otomatik kurulumu da kapılı (QA'da READ bile $TMP'ye FM yazardı)", () => {
    const boot = read("sap-consultant", "skills", "screen-gen", "scripts", "bootstrap_fm.py");
    gateBefore(pyFunction(boot, "ensure_generator_fm"), "require_writable(", "create_function_group(");
    gateBefore(pyFunction(boot, "main"), "require_writable(", "create_function_group(");
  });
});

describe("abapgit-deploy — SAP GUI sürücülerinde DEV kapısı", () => {
  const dir = ["sapgui-scriptter", "skills", "abapgit-deploy", "scripts"];

  it("tier_gate.py yalnızca DEV'e izin veriyor ve bilinmeyeni reddediyor", () => {
    const gate = read(...dir, "tier_gate.py");
    expect(gate).toContain("AXET-TIER-GATE");
    expect(gate).toMatch(/if conn is None:\s*\n\s*return \(/);
    expect(gate).toMatch(/if tier is None:\s*\n\s*return \(/);
    expect(gate).toMatch(/if tier != "DEV":\s*\n\s*return \(/);
  });

  // SAP'a yazan her giriş noktası. Salt okuyan yardımcılar (inspect_screen,
  // read_status_bar, …) kapısız kalıyor — QA'da ekranı okumak serbest.
  const WRITERS = [
    "abapgit_deploy.py",
    "abapgit_bootstrap.py",
    "gui_import_zip.py",
    "gui_activate_package.py",
    "gui_stage_commit.py",
    "gui_run_zabapgit_auto.py",
    "gui_run_zabapgit_bootstrap.py",
    "gui_run_zabapgit_bootstrap_multi.py",
    "gui_run_zabapgit_deploy_multi.py"
  ];

  it.each(WRITERS)("%s main() argümanları okur okumaz kapıya soruyor", (file) => {
    const body = pyFunction(read(...dir, file), "main");
    const parsed = body.indexOf("args = parser.parse_args()");
    const gate = body.indexOf("require_dev_tier(");
    expect(gate).toBeGreaterThan(parsed);
    // parse_args ile kapı arasında başka iş yok: kapıdan önce SAP'a dokunulmuyor.
    expect(body.slice(parsed, gate)).not.toMatch(/attach_scripting_engine|_run_step|subprocess/);
    expect(body.slice(gate)).toMatch(/if refused:\s*\n\s*print\(refused, file=sys\.stderr\)\s*\n\s*return 2/);
  });
});

describe("ajana giden not — GR_TIER reddi arıza değil", () => {
  // Kapı sessiz kalırsa ajan reddi arıza sanıp etrafından dolaşmaya kalkar
  // (`.conn_adt`'ı düzenlemek, aynı işi genel GUI komutlarıyla yapmak).
  // sap-context.md'deki not bunu önlüyor; metin silinirse bu test kırılsın.
  const launcher = readFileSync(path.join(__dirname, "..", "app-electron", "main", "launcher.ts"), "utf8");

  it("DEV dışında kurulan yazan skill'ler adıyla anılıyor ve reddin bilinçli olduğu yazıyor", () => {
    for (const name of ["screen-gen", "adobe-gen", "abapgit-deploy", "sap-object-transfer"]) {
      expect(launcher).toContain(`"${name}"`);
    }
    expect(launcher).toContain("REFUSED [GR_TIER]");
    expect(launcher).toContain("Bu bir arıza DEĞİL");
  });
});
