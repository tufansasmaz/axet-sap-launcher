# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A **distribution of skills**, not an application. It adapts the NTT marketplace plugins
(`sap-consultant`, `abapgit-bridge`, `office-tools`, `axet-flows`, `ntt-s4-migrator`,
`ntt-atc-batch-remediator`, `celonis`, `sap-datasphere`, `sap-ecosystem`,
`sapgui-scriptter`) into self-contained skill folders that install into a
project's `.axet-code/skills/` directory for **aXet.code** (NTT DATA's Crush-based CLI,
which has no plugin/marketplace system and cannot use MCP). There is no build step, no
lint config, and no test suite — each skill is a `SKILL.md` plus standalone Python scripts.

The full user/agent-facing documentation lives in `README.md`; read it for install flows,
SAP API policy, and per-skill descriptions. This file covers what isn't obvious from a
single file.

## Non-negotiable: writing to SAP is confined to DEV, and to one role

Until 2026-09-23 this toolkit could not write to SAP at all. That changed by user
decision (*"artık sap sistemlerindeki readonly modu kaldırabiliriz dev sistemde
geliştirme, deploy gibi işlemleri yapabiliriz"*) — but the gate did not disappear, it
**moved**, and there are now three of them. They are deliberately redundant; do not
collapse them into one.

| # | Gate | Where | What it sees |
|---|---|---|---|
| 1 | which skills are installed | `planSkills()` in the launcher's `skillProfiles.ts` | role + tier |
| 2 | which server is started on 8787 | `adtServerScriptFor()` in `launcher.ts`, fed from `SkillInstallResult.adtWriteSurface` | role + tier |
| 3 | the engine's own `require_writable()` | `sap-adt/scripts/guardrails.py`, `_WRITABLE_TIERS = {"DEV"}` | tier only |

Gate 3 **cannot see the role**, which is why gate 2 has to exist: skills are documentation
the agent reads, but the HTTP port is the surface it actually calls. If those two were
computed separately they could disagree, and a module consultant on a DEV system would
read `sap-adt-readonly` in its skill list while `adt_push` was being served on 8787.

Two rules protect the role gate specifically:

- **`planSkills` swaps the engine name DOWNWARDS ONLY.** A role whose list says
  `sap-adt-readonly` keeps it on a DEV system. Role promotion comes from the role's own
  list, never from the tier — a two-way map would make "DEV" mean "promote everyone".
- **A module consultant never receives a write-capable skill**, and that is enforced by
  the profile lists, not by a runtime check: `sap-adt`, `screen-gen`, `adobe-gen`,
  `sap-object-transfer` and every `abapgit-*` writer appear only under
  `technical-consultant` (user, 2026-09-23: *"modül danışmanları asla geliştirme
  yapamasınlar"*).

When touching `sap-consultant/skills/sap-adt-readonly/scripts/adt_readonly_server.py`,
preserve its two internal locks:

- **Belt** — `ADT_READONLY=true` is set *before* the engine is imported, so every write
  path refuses at source (`GR_READONLY`).
- **Suspenders** — the 13 write-capable tools are removed from the registry before the
  transport starts, so they are neither listed nor callable (`404 unknown_tool`).
  Unsetting `ADT_READONLY` afterwards does not bring them back.

Its **drift pin** is load-bearing: every tool the engine registers must be classified
ALLOW / GATED / DENY, and an unclassified one makes the server refuse to start, naming it.
A new upstream write tool therefore cannot silently inherit "exposed".

The engine under `sap-adt/scripts/` is **vendored verbatim** from upstream. Do not edit it
to add features here — both servers wrap it unchanged, and the read-only one imports it
from its sibling folder rather than keeping a second copy.

## How SAP is reached (the MCP workaround)

aXet.code can't speak MCP stdio, so SAP ADT runs behind a localhost HTTP server holding
**one persistent SAP session**. Two entrypoints, one engine, exactly one running:

```bash
# Read-only surface — 17 tools. NOTE: --http is mandatory; without it this speaks MCP stdio.
ADT_CWD=$(pwd) py sap-consultant/skills/sap-adt-readonly/scripts/adt_readonly_server.py --http --port 8787

# Write surface — the engine's 33 tools. Technical consultant + DEV only.
ADT_CWD=$(pwd) py sap-consultant/skills/sap-adt/scripts/adt_mcp_server.py --http --port 8787

# Health / auth — /health names the surface and lists the tools. Ask it; never guess.
python -c "import requests; print(requests.get('http://127.0.0.1:8787/health').json())"
python -c "import requests; print(requests.post('http://127.0.0.1:8787/tool/adt_logon', json={}).json())"
```

Endpoints: `GET /health`, `GET /tools`, `POST /tool/<name>` (JSON kwargs body). Optional
bearer auth via `ABAP_HTTP_TOKEN`. **Never call the Python scripts directly** for SAP work
— a fresh process per call spawns a new SAP session and bypasses every gate above.

Three read tools are additionally gated on the read-only surface, each behind its own
variable, because "read-only" reads as "harmless" and these are not: `adt_sql`
(`ADT_RO_ALLOW_SQL`), `adt_unit_test` (`ADT_RO_ALLOW_UNIT_TEST`), `adt_dumps`
(`ADT_RO_ALLOW_DUMPS`).

Credentials come from a `.conn_adt` file (see `.conn_adt.example`; gitignored). SAML/BTP
variants exist — run `scripts/login_saml_sso.py` once for SAML.

## Installation model (why the folder layout matters)

Skills are installed **per project**, not user-global, into `<project>/.axet-code/skills/`,
and aXet.code discovers them at **startup** (restart required after install). The installers
`scripts/link-skills.{sh,ps1}` map 21 skill folders (see the `SKILLS` array) into that dir.

> In the launcher the real installer is `installSkillsIntoProject()`; the source of truth
> for *which* skills a project gets is `SKILL_CATALOG` + `PROFILE_SKILLS` in
> `app-electron/main/skillProfiles.ts` (57 skills as of 2026-09-23), not the `SKILLS`
> array in the shell scripts below. Those scripts are for using this toolkit standalone
> and have not tracked the catalog since 2026-09-08 — `toolkit-version.json` is the
> authoritative inventory. The answer also depends on the **role**: a project does not get
> "the skills", it gets its consultant profile's skills.

- **Copy mode is the default** (`--copy` / `-Copy`) because some aXet.code scanners don't
  follow symlinks. Copies are a snapshot → re-run after `git pull`. If adding/removing a
  skill, update the `SKILLS` list in **both** `link-skills.sh` and `link-skills.ps1`.
- The plugin sub-folder structure (`office-tools/skills/` + `office-tools/lib/`) is
  preserved intact because office scripts import the shared masker `lib/redact.py` and the
  house theme `lib/theme.py` via a path relative to their plugin root.

### Shared files that live OUTSIDE the skill folder

Two folders are deliberately not part of any skill, and the scripts reach up past the
skill boundary to find them:

| Source | Installed as | Reached by | Used by |
| --- | --- | --- | --- |
| `office-tools/lib` **+** `sap-consultant/lib` | `<project>/.axet-code/lib` (MERGED) | `sys.path.insert(0, .../scripts/../../../lib)` | `office-docx`, `office-pdf`, `office-pptx`, `office-manual`, `fast-scan-question-generator`, `project-store` |
| `sap-consultant/scripts` | `<project>/.axet-code/scripts` | `py "${CLAUDE_PLUGIN_ROOT}/scripts/<x>.py"` | `abap-code-checker`, `fs-generator`, `ts-generator`, `sap-cr-scope`, `sap-cr-handover`, `sap-incident` |

The **merge** in the first row is forced by our install layout, not a convenience.
Upstream every plugin has its own `lib/`, and `../../../lib` from
`<plugin>/skills/<name>/scripts` lands inside that plugin. We flatten the plugin layer
away — every skill sits at `.axet-code/skills/<name>` — so the same expression resolves
to ONE `.axet-code/lib` for all of them. Hence `SharedAsset.paths` is a list copied in
order into a single destination, and a filename colliding between two sources would
silently let the last one win (`tests/skillCatalogFiles.test.ts` fails if one ever does).

> `sap-consultant/lib/onedrive.py` was **never packaged until 2026-09-23** and the
> failure was silent in the usual way: the import falls back to `candidate_roots = None`,
> so `fast-scan-question-generator` could not discover a synced SharePoint library at all
> (`checks = []` → `not_found`) and only worked when a consultant set
> `FAST_SCAN_SOURCE_ROOT` by hand. `project-store` carries its own fallback and merely
> lost the registry-based discovery.

The launcher copies both — see `SHARED_ASSETS` in `app-electron/main/skillProfiles.ts` and
`installSharedAssets()` in `sapToolkit.ts`. **Before 2026-09-08 it copied neither**, and
the failure was invisible rather than loud: `redact.py` missing means `--redact-pii`
(TCKN/tax-ID masking) silently turns itself off and the document is produced unmasked.
`tests/skillCatalogFiles.test.ts` now scans every bundled skill for these two access
patterns and fails if a skill needs a shared folder that no `SHARED_ASSETS` entry lists.

`${CLAUDE_PLUGIN_ROOT}` itself does not exist in this distribution — there is no plugin
root and aXet.code never sets the variable. Each affected `SKILL.md` carries an adaptation
note telling the agent to read it as `.axet-code/scripts/`.

## Skill anatomy

Every `skills/<name>/` folder has:
- `SKILL.md` — YAML frontmatter (`name`, `description` with trigger keywords) + prose. The
  `description` drives skill matching, so keep triggers accurate when editing.
- `scripts/` — standalone Python entrypoints (office skills are CLI: `py <script>.py
  --input ... --output ...`; `--redact-pii` on `office-pdf`/`-pptx`/`-docx` masks TCKN/tax
  IDs).
- `references/` — deeper docs loaded on demand.

## Dependencies

`pip install -r requirements.txt`. Notable: the read-only server imports the vendored ADT engine
which imports `mcp` (FastMCP); `office-pdf` needs Playwright Chromium installed on demand
(`py -m playwright install chromium`); `office-slides --render` needs Marp
(`npm install -g @marp-team/marp-cli`). `abapgit-bridge` is stdlib-only.

## fs-generator & ts-generator span two plugin groups

`sap-consultant/skills/fs-generator/` (author an FS from requirements + a template) and
`sap-consultant/skills/ts-generator/` (convert that FS into a TS) are a pair — the FS
produced by the first feeds the second. Both are read-only toward SAP (they produce
documents), and both render PDFs by shelling out to
`office-tools/skills/office-pdf/scripts/md_to_pdf.py`, resolved relative to `__file__` for
the repo clone and the installed sibling-skill layout (override with `OFFICE_PDF_SCRIPT`) —
`fs-generator/scripts/render_pdf.py` (single file) and `ts-generator/scripts/merge_and_pdf.py`
(merges 5 parts). If you relocate any of these, keep the resolvers in sync. PDF text
extraction is Node (`extract_pdf.js` + `pdfjs-dist`, its own `npm install`); everything else
is Python stdlib. Both are intentionally interactive — `fs-generator` is strictly grounded
(no hallucination; the prompt is credited to Dersim Tas) and `ts-generator` must ask
clarification questions and wait before emitting the TS.

> `fs2ts` was this pair's older half and was removed on 2026-09-07: its `description`
> triggered on the same phrases as `ts-generator`'s, so the agent picked between two
> near-identical skills by chance.

## Version stamping

`toolkit-version.json` at this root carries a **content-derived** version plus a per-skill
hash — generated by `build/genToolkitVersion.cjs` in the launcher repo, which runs as part
of `npm run prebuild`. Do not hand-edit it; change a skill and re-run the generator. The
launcher writes the same version into `<project>/.axet-code/skills/.version` on install,
which is the only way to answer "are this project's skills current?".

## What does NOT go into the project copy

`installSkillsIntoProject()` (launcher, `app-electron/main/sapToolkit.ts`) copies all
three ADT skills — `sap-adt`, `sap-adt-readonly`, `sap-adt-router-bridge` — **without
their `scripts/` directories** (`excludeDirs: ["scripts"]` on each). Two reasons, and both
matter:

- The engine is the full ADT server, write paths included. The skills themselves instruct
  the agent to talk to the HTTP server and never run the scripts, so a copy in the agent's
  working tree is exposure with no upside.
- The wrapper imports the engine from `../sap-adt/scripts` and **refuses to start** if it
  is missing, so the three must stay siblings. Excluding `scripts` from every project copy
  is what guarantees the server always starts from this toolkit root, where they are.

If that exclusion is ever lifted for one of the three, the sibling relationship breaks.

**A script that reaches for the engine by path is a bug in this distribution.** Upstream's
`test-scenarios/scripts/scan_doc_types.py` does exactly that; ours talks to the HTTP gate
instead. See the local-patch table below.

## abapGit is still the path to QA and production

Writing is open on DEV now, but only there and only for the technical consultant. **QA and
production are reached by transport, never by `adt_push`** — a direct write desynchronises
the system from the request that is supposed to describe it, and the first symptom is a
defect nobody can reproduce after the next import.

Where a transport is not the vehicle, use the `abapgit-workflow` skill: Claude edits
`src/`, `abapgit-export-zip` packs a ZIP, the developer imports it in SAPGUI, and
`abapgit-import-status-zip` ingests activation errors back into `.abapgit-status/`. It is
developer-in-the-loop by design; there is no SAP-side automation.

None of this replaces the older rule: **every SAP write needs a named human's approval and
a transport they confirmed.** The three gates cannot enforce that one for you.

## Upstream'den AYRILAN dosyalar (yenilerken üstüne yazma)

Paket, `global-innovation-lab/ntt-claude-marketplace` deposunun bir uyarlamasi.
Depo salt okunur kullaniliyor: oraya hicbir sey yazilmiyor. Buradan yukari akisi
tazelerken asagidaki dosyalarin uzerine YAZMA -- hepsi bilincli bir uyarlama
tasiyor ve `git diff` ile kurtarilamayacak sekilde kaybolur:

Her uyarlanan dosya bir isaret tasiyor: govdesinde **`NTT Studio`** gecen her dosya bu
tablodadir. Bir senkrondan sonra `grep -rl "NTT Studio" resources/sap-toolkit` say -- eksik
cikan sayi, ustune yazilmis bir uyarlamadir. 2026-09-23'te tam da bu oldu: toptan bir
`cpSync` 11 dosyanin uyarlama blogunu sildi ve `git diff` disinda hicbir yerde gorunmedi.

| Dosya | Ne degistirildi | Neden |
| --- | --- | --- |
| `sap-consultant/skills/sap-adt/SKILL.md` | `description`'a + govdenin basina "MCP degil, HTTP" blogu (8787, bearer token, "`adt_*` gormemek bagli olmamak degil") | 2026-09-24, MAYA: ajan `adt_*` araci goremeyince "bagli degilim" dedi, tek cagri yapmadi. `tests/skillHttpAdaptation.test.ts` kilitliyor |
| `sap-consultant/skills/sap-adt-readonly/SKILL.md` | Ayni blok + "8790 degil 8787" + `/tools` (sap-adt kurulu olmayabilir) | 1.6.7'deki "aXet.code edition" d2cb667 senkronunda ezilmisti; ayni test |
| `.../screen-gen/SKILL.md`, `.../sap-object-transfer/SKILL.md` | MCP araci/oturumu = 8787'ye POST; transfer icin `--port 8787` | `transfer_deploy.py` varsayilani 8786 |
| `.../abap-code-checker/SKILL.md` | MCP -> HTTP; hangi yuzey acik; `adt_unit_test` kapisi; `${CLAUDE_PLUGIN_ROOT}` | aXet.code MCP konusamiyor; yuzey role+tier'a gore degisiyor |
| `.../as-built-doc/SKILL.md` | ayni sekil, `adt_sql` kapisi | ayni |
| `.../sap-cr-scope/SKILL.md` | ayni sekil + `case.py` notu | ayni |
| `.../sap-cr-handover/SKILL.md` | ayni sekil + "release bu skill'in isi degil" | ayni |
| `.../sap-incident/SKILL.md` | ayni sekil; §8'in DEV yolu artik GERCEKTEN calisiyor | Yazma yuzeyi teknik danisman + DEV'de aciliyor |
| `.../sap-incident/references/solution-proposal.md` | Ayni push adimina rol/tier notu | ayni |
| `.../sap-adt/scripts/credential_charset.py` | YENI dosya (yukari akista yok) | Basic Auth baytlari tek yerden uretiliyor; varsayilan UTF-8, `.conn_adt`'taki `ADT_SAP_PW_CHARSET` satiri elle ezebiliyor |
| `.../sap-adt/scripts/sap_adt_lib.py` | `auth_string.encode('ascii')` -> `encode_basic_credentials()` | ASCII disi sifre EskiDEN UnicodeEncodeError ile patliyordu |
| `.../sap-adt/scripts/auth/basic_auth_provider.py` | sabit `.encode('utf-8')` -> ayni fonksiyon | Motorun iki auth yolu da ayni baytlari uretsin; ADT_SAP_PW_CHARSET ikisine birden islesin |
| `.../test-scenarios/SKILL.md` | MCP -> HTTP + `ADT_RO_ALLOW_SQL` notu | ayni |
| `.../test-scenarios/scripts/scan_doc_types.py` | ADT motoru import'u -> `ReadOnlyHttpClient` | `../../sap-adt/scripts` kurulu agacta HIC yok (`excludeDirs`) |
| `.../sap-enduser-doc/SKILL.md` | MCP -> HTTP + npm bagimliligi uyarisi | ayni |
| `.../fs-generator/SKILL.md`, `.../ts-generator/SKILL.md` | `${CLAUDE_PLUGIN_ROOT}` notu | Eklenti koku yok |
| `sapgui-scriptter/skills/sapgui-screenshots/SKILL.md` | "PRD'de sadece goruntuleme" kurali | Tus basabiliyor, yanlislikla kaydedebilir; ADT tier kapisi buraya UZANMIYOR |
| `requirements.txt`, `CLAUDE.md`, `README.md`, `toolkit-version.json` | Bu dagitima ait | Yukari akista yok |

### Alinmayanlar ve sebepleri

| Alinmayan | Neden |
| --- | --- |
| `project-kb/*` (beta-enerji, kibar-americas, ozak-tekstil, sun-tekstil-jimmy-key) | Musteriye ait gercek sistem verisi: tablo adlari, sirket kodlari, sure ve kapsam kayitlari. **Bu depo PUBLIC.** Kullanici karari (2026-09-23: *"alma paketleme onlari"*). Yapisi degil, ICERIGI engel -- ayni skill kabugu musterinin kendi ortaminda kurulabilir. |
| `sap-adt-mcp` | MCP istemcisi; aXet.code MCP konusamiyor, yani kurulsa da calismaz. Kullanici karari: *"Simdilik alma"*. |
| `abapgit-adt` | ADT uzerinden abapGit surer. Yazma artik var ama bu skill'in yolu `adt_*` ile SAP'a abapGit repo'su kurmak -- bizim teslim yolumuz `abapgit-workflow` (gelistirici-donguyu-kapatir) ve ikisi ayni isi iki farkli sozlesmeyle yapiyor. Ikisi birden kuruluysa ajan hangisini sececegini bilmiyor. |
| `ntt-skill-setup` | Rakip kurulumcu: projeye skill kuran bir skill. Bu isi uygulamanin kendisi yapiyor (`installSkillsIntoProject`) ve rol kapisi orada. Ajanin elinde kendi skill'lerini kurabilecegi bir arac olmasi, 1. kapiyi anlamsiz kilar. |
| `sap-bw`, `sap-sac` | Skill degil, vendor'lanmis MCP sunuculari. |

Bilerek AYRISAN (alindi ama birebir degil): `sap-adt` (yalnizca `__pycache__` farki),
`sap-adt-router-bridge` (bizde fazladan `adt_rfc_probe.py` var -- yukari akista yok),
`axet-flows` (yalnizca bir `.pyc` disarida), `fs2ts` (HIC alinmiyor: `ts-generator`'in
2026-08-02 oncesi adi; ikisi ayni ifadelerle tetikleniyor).

Karsilastirirken satir sonu tuzagi: bu depoda `core.autocrlf = true`, calisma
kopyasi CRLF, marketplace LF. Normalize etmeden diff/hash alirsan HER dosya
farkli gorunur.
