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

## Non-negotiable: SAP is READ-ONLY

The `sap-consultant` plugin was adapted specifically to strip write access. When touching anything
under `sap-consultant/skills/sap-adt-readonly/`, preserve the two independent locks in
`scripts/adt_readonly_server.py`:

- **Belt** — `os.environ["ADT_READONLY"] = "true"` is set *before* `import adt_mcp_server`,
  so every write path in the vendored engine refuses at source (`GR_READONLY`).
- **Suspenders** — only the 20 names in the `READONLY_TOOLS` frozenset are exposed over
  HTTP. Write tools (`adt_push`, `adt_create`, `adt_activate`, `adt_delete_object`,
  transport mutations, `adt_generate_screen`) are never registered → `POST` returns
  `404 unknown_tool`.

The engine under `scripts/` (`adt_mcp_server.py`, `sap_client.py`, `sap_adt_lib.py`,
`guardrails.py`, etc.) is **vendored verbatim** from the upstream `sap-consultant` plugin. Do not
edit it to add features here — the read-only server wraps it unchanged. `screen-gen` is
shipped for reference only; generation is a write and is disabled.

## How SAP is reached (the MCP workaround)

aXet.code can't speak MCP stdio, so SAP ADT runs behind a localhost HTTP server holding
**one persistent SAP session**:

```bash
# Start (background). ADT_CWD points at the folder holding .conn_adt.
ADT_CWD=$(pwd) py sap-consultant/skills/sap-adt-readonly/scripts/adt_readonly_server.py --port 8787

# Health / auth
python -c "import requests; print(requests.get('http://127.0.0.1:8787/health').json())"
python -c "import requests; print(requests.post('http://127.0.0.1:8787/tool/adt_logon', json={}).json())"
```

Endpoints: `GET /health`, `GET /tools`, `POST /tool/<name>` (JSON kwargs body). Optional
bearer auth via `ABAP_HTTP_TOKEN`. **Never call the Python scripts directly** for SAP work
— a fresh process per call spawns a new SAP session and bypasses the read-only gate.

Credentials come from a `.conn_adt` file (see `.conn_adt.example`; gitignored). SAML/BTP
variants exist — run `scripts/login_saml_sso.py` once for SAML.

## Installation model (why the folder layout matters)

Skills are installed **per project**, not user-global, into `<project>/.axet-code/skills/`,
and aXet.code discovers them at **startup** (restart required after install). The installers
`scripts/link-skills.{sh,ps1}` map 21 skill folders (see the `SKILLS` array) into that dir.

> In the launcher the real installer is `installSkillsIntoProject()`; the source of truth
> for *which* skills a project gets is `SKILL_CATALOG` + `PROFILE_SKILLS` in
> `app-electron/main/skillProfiles.ts` (45 skills as of 2026-09-08), not the `SKILLS` array
> in the shell scripts below. Those scripts are for using this toolkit standalone.

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
| `office-tools/lib` | `<project>/.axet-code/lib` | `sys.path.insert(0, .../scripts/../../../lib)` | `office-docx`, `office-pdf`, `office-pptx`, `office-manual` |
| `sap-consultant/scripts` | `<project>/.axet-code/scripts` | `py "${CLAUDE_PLUGIN_ROOT}/scripts/<x>.py"` | `abap-code-checker`, `fs-generator`, `ts-generator`, `sap-cr-scope`, `sap-cr-handover`, `sap-incident` |

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

`installSkillsIntoProject()` (launcher, `app-electron/main/sapToolkit.ts`) copies
`sap-adt-readonly` **without its `scripts/` directory**. The engine there is the full
1400-line ADT server, write paths included, and the skill itself instructs the agent to talk
to the HTTP server and never run the scripts — so a copy in the agent's working tree is
exposure with no upside. The launcher starts the server from this toolkit root instead.
The `scripts/` folder must stay here: `adt_readonly_server.py` imports `adt_mcp_server`,
and that import is the belt lock above.

## abapGit is the compliant write path

SAP's API policy treats ADT as internal/read-only for agentic workflows. To *deliver* ABAP
changes, never use the SAP server — use the `abapgit-workflow` skill: Claude edits `src/`,
`abapgit-export-zip` packs a ZIP, the developer imports it in SAPGUI, and
`abapgit-import-status-zip` ingests activation errors back into `.abapgit-status/`. It is
developer-in-the-loop by design; there is no SAP-side automation.

## Upstream'den AYRILAN dosyalar (yenilerken üstüne yazma)

Paket, `global-innovation-lab/ntt-claude-marketplace` deposunun bir uyarlamasi.
Depo salt okunur kullaniliyor: oraya hicbir sey yazilmiyor. Buradan yukari akisi
tazelerken asagidaki dosyalarin uzerine YAZMA -- hepsi bilincli bir uyarlama
tasiyor ve `git diff` ile kurtarilamayacak sekilde kaybolur:

| Dosya | Ne degistirildi | Neden |
| --- | --- | --- |
| `sap-consultant/skills/sap-adt-readonly/**` | Tum skill yeniden yazildi; `references/` eklendi | Yazma yollari kapatildi (belt + suspenders) |
| `.../abap-code-checker/SKILL.md` | MCP -> HTTP notu | aXet.code MCP konusamiyor |
| `.../as-built-doc/SKILL.md` | MCP -> HTTP notu | ayni |
| `.../sap-cr-scope/SKILL.md` | MCP -> HTTP + `${CLAUDE_PLUGIN_ROOT}` notu | ayni |
| `.../sap-cr-handover/SKILL.md` | MCP -> HTTP + `${CLAUDE_PLUGIN_ROOT}` notu | ayni |
| `.../sap-incident/SKILL.md` | MCP -> HTTP; `adt_push`/`adt_activate` adimlari ustu cizili | O araclar sunucuda hic acilmiyor |
| `.../sap-incident/references/solution-proposal.md` | Ayni yazma adimi ustu cizili | ayni |
| `.../test-scenarios/SKILL.md` | MCP -> HTTP notu | ayni |
| `.../test-scenarios/scripts/scan_doc_types.py` | ADT motoru import'u -> `ReadOnlyHttpClient` | Tam yetkili motor bu pakette bilerek yok |
| `.../sap-enduser-doc/SKILL.md` | MCP -> HTTP + npm bagimliligi uyarisi | ayni |
| `.../fs-generator/SKILL.md`, `.../ts-generator/SKILL.md` | `${CLAUDE_PLUGIN_ROOT}` notu | Eklenti koku yok |
| `sapgui-scriptter/skills/sapgui-screenshots/SKILL.md` | "PRD'de sadece goruntuleme" kurali | Tus basabiliyor, yanlislikla kaydedebilir |
| `requirements.txt`, `CLAUDE.md`, `toolkit-version.json` | Bu dagitima ait | Yukari akista yok |

Alinmayanlar ve sebepleri: `sap-adt` (tam yetkili yazma motoru),
`sap-object-transfer` / `adobe-gen` / `abapgit-deploy` (SAP'a yaziyor),
`project-kb/*` (musteriye ait gercek sistem verisi -- bu depo PUBLIC),
`ntt-skill-setup` (rakip kurulumcu; bu isi uygulama yapiyor),
`sap-adt-router-bridge` (uygulamanin kendi RFC koprusu var),
`abapgit-adt` (tam `sap-adt`'ye bagimli), `sap-bw` / `sap-sac` (skill degil,
vendor'lanmis MCP sunuculari -- aXet.code MCP konusamiyor).

Karsilastirirken satir sonu tuzagi: bu depoda `core.autocrlf = true`, calisma
kopyasi CRLF, marketplace LF. Normalize etmeden diff/hash alirsan HER dosya
farkli gorunur.
