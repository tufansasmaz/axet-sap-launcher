// resources/sap-toolkit/toolkit-version.json üretir.
//
// Sürüm SAATTEN DEĞİL İÇERİKTEN türetiliyor: her skill klasörünün dosya
// adları + içerikleri sha256'lanıyor, hepsinin birleşimi de paketin sürümü
// oluyor. Böylece "değişmediği hâlde sürümü artmış" bir toolkit olmuyor;
// projedeki damga ile paketteki sürüm eşitse gerçekten aynılar.
//
// Çalıştır: node build/genToolkitVersion.cjs
// (build:win öncesi otomatik çalışır, prebuild adımına bağlı.)

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "resources", "sap-toolkit");
const SKIP = new Set(["__pycache__", ".git", "node_modules"]);

function hashDir(dir) {
  const h = crypto.createHash("sha256");
  const walk = (current, rel) => {
    const entries = fs.readdirSync(current, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0
    );
    for (const e of entries) {
      if (SKIP.has(e.name)) continue;
      const full = path.join(current, e.name);
      const relPath = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        walk(full, relPath);
      } else if (e.isFile()) {
        h.update(relPath);
        h.update(fs.readFileSync(full));
      }
    }
  };
  walk(dir, "");
  return h.digest("hex");
}

function collectSkills() {
  const out = {};
  for (const plugin of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!plugin.isDirectory() || SKIP.has(plugin.name)) continue;
    const skillsDir = path.join(ROOT, plugin.name, "skills");
    if (!fs.existsSync(skillsDir)) continue;
    for (const skill of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (!skill.isDirectory()) continue;
      const full = path.join(skillsDir, skill.name);
      if (!fs.existsSync(path.join(full, "SKILL.md"))) continue;
      out[skill.name] = hashDir(full).slice(0, 16);
    }
  }
  return out;
}

const skills = collectSkills();
const names = Object.keys(skills).sort();
const rootHash = crypto
  .createHash("sha256")
  .update(names.map((n) => `${n}:${skills[n]}`).join("\n"))
  .digest("hex");

const payload = {
  version: `${new Date().toISOString().slice(0, 10).replace(/-/g, ".")}+${rootHash.slice(0, 8)}`,
  generated: new Date().toISOString(),
  source: "NTT ABAP skill katalogu (elle uyarlanmis dagitim)",
  skills: Object.fromEntries(names.map((n) => [n, skills[n]]))
};

const target = path.join(ROOT, "toolkit-version.json");
const previous = fs.existsSync(target)
  ? JSON.parse(fs.readFileSync(target, "utf8"))
  : null;

// İçerik hash'i aynıysa dosyaya dokunma: yoksa her derlemede `generated`
// değişir, sürüm de tarihten ötürü kayar ve "güncelleme var" yalanı doğar.
if (previous && previous.version && previous.version.endsWith(`+${rootHash.slice(0, 8)}`)) {
  console.log(`toolkit-version.json degismedi (${previous.version})`);
  process.exit(0);
}

fs.writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`toolkit-version.json yazildi: ${payload.version} (${names.length} skill)`);
