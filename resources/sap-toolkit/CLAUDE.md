# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A **distribution of skills**, not an application. It adapts three NTT plugins (`abaper`,
`abapgit-bridge`, `office-tools`) into self-contained skill folders that install into a
project's `.axet-code/skills/` directory for **aXet.code** (NTT DATA's Crush-based CLI,
which has no plugin/marketplace system and cannot use MCP). There is no build step, no
lint config, and no test suite — each skill is a `SKILL.md` plus standalone Python scripts.

The full user/agent-facing documentation lives in `README.md`; read it for install flows,
SAP API policy, and per-skill descriptions. This file covers what isn't obvious from a
single file.

## Non-negotiable: SAP is READ-ONLY

The `abaper` plugin was adapted specifically to strip write access. When touching anything
under `abaper/skills/sap-adt-readonly/`, preserve the two independent locks in
`scripts/adt_readonly_server.py`:

- **Belt** — `os.environ["ADT_READONLY"] = "true"` is set *before* `import adt_mcp_server`,
  so every write path in the vendored engine refuses at source (`GR_READONLY`).
- **Suspenders** — only the 20 names in the `READONLY_TOOLS` frozenset are exposed over
  HTTP. Write tools (`adt_push`, `adt_create`, `adt_activate`, `adt_delete_object`,
  transport mutations, `adt_generate_screen`) are never registered → `POST` returns
  `404 unknown_tool`.

The engine under `scripts/` (`adt_mcp_server.py`, `sap_client.py`, `sap_adt_lib.py`,
`guardrails.py`, etc.) is **vendored verbatim** from the upstream `abaper` plugin. Do not
edit it to add features here — the read-only server wraps it unchanged. `screen-gen` is
shipped for reference only; generation is a write and is disabled.

## How SAP is reached (the MCP workaround)

aXet.code can't speak MCP stdio, so SAP ADT runs behind a localhost HTTP server holding
**one persistent SAP session**:

```bash
# Start (background). ADT_CWD points at the folder holding .conn_adt.
ADT_CWD=$(pwd) py abaper/skills/sap-adt-readonly/scripts/adt_readonly_server.py --port 8787

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

- **Copy mode is the default** (`--copy` / `-Copy`) because some aXet.code scanners don't
  follow symlinks. Copies are a snapshot → re-run after `git pull`. If adding/removing a
  skill, update the `SKILLS` list in **both** `link-skills.sh` and `link-skills.ps1`.
- The plugin sub-folder structure (`office-tools/skills/` + `office-tools/lib/`) is
  preserved intact because office scripts import the shared masker `lib/redact.py` via a
  path relative to their plugin root. **Run office scripts by their real repo path in the
  clone**, not the installed `.axet-code/skills/` copy — otherwise the `../../../lib`
  import fails and `--redact-pii` silently disables.

## Skill anatomy

Every `skills/<name>/` folder has:
- `SKILL.md` — YAML frontmatter (`name`, `description` with trigger keywords) + prose. The
  `description` drives skill matching, so keep triggers accurate when editing.
- `scripts/` — standalone Python entrypoints (office skills are CLI: `py <script>.py
  --input ... --output ...`; `--redact-pii` on `office-pdf`/`-pptx`/`-docx` masks TCKN/tax
  IDs).
- `references/` — deeper docs loaded on demand.

## Dependencies

`pip install -r requirements.txt`. Notable: the read-only server imports the abaper engine
which imports `mcp` (FastMCP); `office-pdf` needs Playwright Chromium installed on demand
(`py -m playwright install chromium`); `office-slides --render` needs Marp
(`npm install -g @marp-team/marp-cli`). `abapgit-bridge` is stdlib-only.

## fs-generator & fs2ts span two plugin groups

`abaper/skills/fs-generator/` (author an FS from requirements + a template) and
`abaper/skills/fs2ts/` (convert that FS into a TS) are a pair — the FS produced by the first
feeds the second. Both are read-only toward SAP (they produce documents), and both render
PDFs by shelling out to `office-tools/skills/office-pdf/scripts/md_to_pdf.py`, resolved
relative to `__file__` for the repo clone and the installed sibling-skill layout (override
with `OFFICE_PDF_SCRIPT`) — `fs-generator/scripts/render_pdf.py` (single file) and
`fs2ts/scripts/merge_and_pdf.py` (merges 5 parts). If you relocate any of these, keep the
resolvers in sync. PDF text extraction is Node (`extract_pdf.js` + `pdfjs-dist`, its own
`npm install`); everything else is Python stdlib. Both are intentionally interactive —
`fs-generator` is strictly grounded (no hallucination; the prompt is credited to Dersim Tas)
and `fs2ts` must ask clarification questions and wait before emitting the TS.

## abapGit is the compliant write path

SAP's API policy treats ADT as internal/read-only for agentic workflows. To *deliver* ABAP
changes, never use the SAP server — use the `abapgit-workflow` skill: Claude edits `src/`,
`abapgit-export-zip` packs a ZIP, the developer imports it in SAPGUI, and
`abapgit-import-status-zip` ingests activation errors back into `.abapgit-status/`. It is
developer-in-the-loop by design; there is no SAP-side automation.
