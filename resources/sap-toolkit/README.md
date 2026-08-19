# SAP Toolkit for aXet.code

**Read-only SAP inspection + abapGit delivery + Office document automation — packaged as aXet.code skills.**

This repo adapts three NTT plugins into **skills** that work in **aXet.code** (NTT DATA's
Crush-based CLI coding assistant). aXet.code has **no plugin/marketplace system** and
**cannot use MCP**, so:

- SAP ADT is reached over a **localhost HTTP server** (the MCP workaround), and here it
  is deliberately **READ-ONLY** — new users can inspect SAP but **cannot change it**.
- **abapGit** delivery and **Office** document skills are plain Python scripts and run
  as-is.

> **If you are an aXet.code agent** setting this up: jump to
> [Agent Self-Installation](#agent-self-installation). Then, before any SAP call, read
> [The read-only SAP server](#the-read-only-sap-server).

---

## ⚠️ AGENT: READ THIS FIRST — SAP is READ-ONLY, over HTTP

> **If the user wants to work with SAP:**
>
> 1. **NEVER run the Python scripts directly.** Start the **read-only HTTP server** and
>    call it over `http://127.0.0.1:8787`. A direct script call spawns a fresh SAP
>    session per call and bypasses the read-only gate.
> 2. **You cannot change SAP.** Create / edit / push / activate / delete / transport
>    writes are disabled two ways: the server forces `ADT_READONLY=true`, **and** it only
>    exposes 20 read tools (write tools return `404 unknown_tool`).
> 3. If the user asks to *deliver* ABAP changes, use the **abapgit-workflow** skill
>    (manual abapGit ZIP cycle, developer-in-the-loop) — not this SAP server.

**Quick check + start (read-only server, background):**
```bash
# Is it up?
python -c "import requests; print(requests.get('http://127.0.0.1:8787/health').json())" 2>/dev/null || echo "NOT RUNNING"

# Start it (run_in_background: true). Point ADT_CWD at the folder holding .conn_adt.
# Windows uses 'py'; macOS/Linux uses 'python3'.
ADT_CWD=$(pwd) py "<sap-toolkit>/abaper/skills/sap-adt-readonly/scripts/adt_readonly_server.py" --port 8787

# Verify SAP auth
python -c "import requests; r=requests.post('http://127.0.0.1:8787/tool/adt_logon', json={}); print(r.json())"
```

Replace `<sap-toolkit>` with wherever this repo was cloned.

---

## Table of Contents

- [What's inside](#whats-inside)
- [Prerequisites](#prerequisites)
- [Agent Self-Installation](#agent-self-installation)
- [Human install](#human-install)
- [The read-only SAP server](#the-read-only-sap-server)
- [Configuration](#configuration)
- [YOLO mode (auto-approve)](#yolo-mode-auto-approve)
- [Available skills](#available-skills)
- [Keeping up to date](#keeping-up-to-date)
- [Verify installation](#verify-installation)
- [Troubleshooting](#troubleshooting)
- [SAP API policy](#sap-api-policy)
- [License](#license)

---

## What's inside

| Source plugin | Skills provided here | SAP access | Needs the HTTP server? |
|---|---|---|---|
| **abaper** (adapted → read-only) | `sap-adt-readonly`, `clean-core`, `sap-docs`, `screen-gen`*, `fs2ts`, `fs-generator` | **read-only** | ✅ `sap-adt-readonly` only |
| **abapgit-bridge** (as-is) | `abapgit-workflow`, `abapgit-export-zip`, `abapgit-import-status-zip`, `abapgit-howto` | none (developer carries ZIPs) | ❌ |
| **office-tools** (as-is) | `office-excel-read/write/transform/report/compare/images`, `office-slides`, `office-pdf`, `office-pptx`, `office-docx`, `office-manual` | n/a | ❌ |

\* **screen-gen** is included for **reference/inspection only** — generating a screen is a
write, so it is disabled in this read-only toolkit.

> **Where skills are installed.** aXet.code scans the **project-level**
> `.axet-code/skills/` directory (relative to the folder you launch it in) — **not** a
> user-global one — and it discovers them at **startup**. Clone this repo once to a stable
> location, then run the installer inside **each project** where you want the skills
> (default is `--copy`, which drops real folders the scanner always finds), and **restart
> aXet.code**. See [Agent Self-Installation](#agent-self-installation).

Repo layout (each `skills/<name>` folder is installed into a project's `.axet-code/skills/`):
```
sap-toolkit/
├── abaper/skills/{sap-adt-readonly, clean-core, sap-docs, screen-gen, fs2ts, fs-generator}/
│   ├── sap-adt-readonly/scripts/adt_readonly_server.py   # the read-only HTTP gate
│   ├── fs-generator/scripts/{extract_pdf.js, render_pdf.py}  # requirements → FS → branded PDF
│   └── fs2ts/scripts/{extract_pdf.js, merge_and_pdf.py}  # FS→TS: PDF in, branded PDF out
├── abapgit-bridge/skills/{abapgit-workflow, abapgit-export-zip, ...}/
├── office-tools/
│   ├── lib/redact.py                 # shared KVKK/PII masker (--redact-pii)
│   └── skills/{office-*}/
├── requirements.txt
└── .conn_adt.example
```

> **Why the plugin sub-folders are kept.** The office scripts import `lib/redact.py`
> via a path relative to their plugin root, so each plugin's `skills/` + `lib/`
> structure is preserved intact. Run scripts by their **real** repo path in the clone —
> not the installed `.axet-code/skills/` copy or link — so those relative imports resolve.

---

## Prerequisites

- **aXet.code** — NTT DATA's Crush-based CLI assistant
- **Python 3.10+** — the SAP server and Office scripts use 3.10 type-hint syntax
- **Git**
- **Node.js 18+** — for `office-slides --render` (Marp) and `fs2ts` PDF extraction
  (`pdfjs-dist`, via `npm install` in the skill's `scripts/`); optional otherwise
- **SAP credentials** — a `.conn_adt` file, for the read-only SAP server (see
  [Configuration](#configuration))

---

## Agent Self-Installation

> **For aXet.code agents.** If the user asks you to install this toolkit, run these
> steps. aXet.code discovers skills under the **project-level** `.axet-code/skills/<name>/`
> directory (relative to where aXet.code is launched), each holding a `SKILL.md`. Clone
> this repo once to a stable location, then run the linker inside the target **project**.
> Repeat the linker step (only) for each additional project that needs the skills.

### 1. Detect platform + Python

```bash
uname -s 2>/dev/null || echo "Windows"
where py 2>/dev/null || where python3 2>/dev/null || where python 2>/dev/null
```

### 2. Clone the repo

```bash
# Windows
git clone https://github.com/global-innovation-lab/sap-toolkit.git "$USERPROFILE/sap-toolkit"
# macOS/Linux
git clone https://github.com/global-innovation-lab/sap-toolkit.git ~/sap-toolkit
```

### 3. Install the skills into the project

Run the installer **from inside the project** where aXet.code will be used (the target
defaults to the current directory). It populates `<project>/.axet-code/skills/` with all
21 skill folders. Re-run it in each additional project that needs the skills.

> **Use `--copy` / `-Copy` — it's the reliable default.** aXet.code discovers skills at
> startup and its scanner does **not** always follow symlinks/junctions, so links can sit
> on disk yet never appear in `list skills`. Copy mode installs **real folders**, which
> are always discovered. (Trade-off: copies are a snapshot — re-run after `git pull`.)

**Windows (PowerShell):**
```powershell
cd C:\path\to\your\project
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\sap-toolkit\scripts\link-skills.ps1" -Copy
```

**macOS / Linux:**
```bash
cd /path/to/your/project
bash ~/sap-toolkit/scripts/link-skills.sh --copy
```

Both accept an explicit target, e.g. `... link-skills.sh --copy /path/to/project`, and
print each skill installed plus the count (should be **21**).

**Then RESTART aXet.code in that project** — skills load at startup, so a session that was
already open won't see them. After restart, ask it to `list skills` or invoke one with
`%skill-name`.

<details><summary>Prefer live-updating links instead of copies?</summary>

If you have confirmed your aXet.code build **does** discover symlinked/junctioned skills
(they show in `list skills` after a restart), drop the `--copy` / `-Copy` flag. Linked
skills refresh automatically on `git pull`; copied ones need the installer re-run. If a
restart then shows no skills, your scanner isn't following links — go back to `--copy`.
</details>

<details><summary>Manual linking (if you can't run the script)</summary>

Create `<project>/.axet-code/skills/` and link each folder from the clone, e.g. on
macOS/Linux:
```bash
tk=~/sap-toolkit; dest=./.axet-code/skills; mkdir -p "$dest"
for p in abaper/skills/sap-adt-readonly abaper/skills/clean-core \
         abaper/skills/sap-docs abaper/skills/screen-gen abaper/skills/fs2ts \
         abaper/skills/fs-generator \
         abapgit-bridge/skills/abapgit-workflow abapgit-bridge/skills/abapgit-export-zip \
         abapgit-bridge/skills/abapgit-import-status-zip abapgit-bridge/skills/abapgit-howto \
         office-tools/skills/office-excel-read office-tools/skills/office-excel-write \
         office-tools/skills/office-excel-transform office-tools/skills/office-excel-report \
         office-tools/skills/office-excel-compare office-tools/skills/office-excel-images \
         office-tools/skills/office-slides office-tools/skills/office-pdf \
         office-tools/skills/office-pptx office-tools/skills/office-docx \
         office-tools/skills/office-manual; do
  n=$(basename "$p"); rm -rf "$dest/$n"; ln -s "$tk/$p" "$dest/$n"
done
```
On Windows use `cmd /c mklink /J "<project>\.axet-code\skills\<name>" "%USERPROFILE%\sap-toolkit\<path>"` per folder.
</details>

### 4. Install Python dependencies

```bash
# Windows
pip install -r "$USERPROFILE/sap-toolkit/requirements.txt"
# macOS/Linux — a venv avoids system-Python conflicts for office-tools
python3 -m venv ~/sap-toolkit/.venv && ~/sap-toolkit/.venv/bin/pip install -r ~/sap-toolkit/requirements.txt

# office-slides --render needs Marp (Node 18+)
npm install -g @marp-team/marp-cli
# office-pdf only — headless Chromium, on demand (~130 MB)
py -m pip install playwright && py -m playwright install chromium
```

### 5. Tell the user

- **Restart aXet.code** so the new skills are discovered.
- Skills are invoked with `%skill-name` (e.g. `%sap-adt-readonly`, `%office-pdf`).
- For SAP, create `.conn_adt` in the project root (see [Configuration](#configuration)),
  then the `sap-adt-readonly` skill starts the read-only server on first use.

---

## Human install

Same as the agent steps above:

1. Clone once: `git clone https://github.com/global-innovation-lab/sap-toolkit.git ~/sap-toolkit`
2. **In each project** you want the skills, run the installer with `--copy` / `-Copy`
   (`link-skills.sh` / `link-skills.ps1`) — it populates that project's
   `.axet-code/skills/` with real folders the scanner reliably finds.
3. `pip install -r ~/sap-toolkit/requirements.txt`.
4. **Restart** aXet.code in the project, then `list skills`.

Copies are a snapshot — re-run the installer after a `git pull`. (If your build discovers
links, you can drop `--copy` for auto-updating links; see the note in step 3 above.)

---

## The read-only SAP server

aXet.code can't use MCP, so SAP ADT is exposed over a small localhost HTTP server that
holds **one persistent SAP session**. This repo ships the **read-only** launcher:
`abaper/skills/sap-adt-readonly/scripts/adt_readonly_server.py`.

**Two independent locks make it impossible to change SAP:**

| Lock | Mechanism |
|---|---|
| **Belt** | The launcher forces `ADT_READONLY=true` into the environment before the engine loads, so every write path (`push`/`create`/`activate`/`delete`/…) refuses with `GR_READONLY`. |
| **Suspenders** | Only 20 read tools are registered on the HTTP surface. Write tools are never mapped, so `POST /tool/adt_push` → `404 unknown_tool`. |

**Endpoints:** `GET /health` · `GET /tools` · `POST /tool/<name>` (JSON kwargs body).
**Optional auth:** set `ABAP_HTTP_TOKEN` to require `Authorization: Bearer <token>`.

**Read tools (20):** `adt_logon`, `adt_doctor`, `adt_get_source`, `adt_search`,
`adt_code_search`, `adt_sql` (SELECT-only), `adt_list_package`, `adt_where_used`,
`adt_revisions`, `adt_syntax_check`, `adt_atc_check`, `adt_unit_test`,
`adt_check_scatter`, `adt_inactive_objects`, `adt_badi_discovery`, `adt_dumps`,
`adt_list_transports`, `adt_transport_status`, `adt_transport_check`, `ping`.

Full usage and a per-tool table live in the `sap-adt-readonly` skill's `SKILL.md`.

---

## Configuration

Create `.conn_adt` in the folder where you launch aXet.code (copy `.conn_adt.example`):

```env
ADT_SAP_URL=https://your-sap-server.com:44300
ADT_SAP_USER=YOUR_USERNAME
ADT_SAP_PASSWORD=YOUR_PASSWORD
ADT_SAP_CLIENT=100
ADT_SAP_LANGUAGE=EN
```

BTP service-key and S/4HANA Cloud SAML variants are in `.conn_adt.example`. For SAML,
run once: `python abaper/skills/sap-adt-readonly/scripts/login_saml_sso.py`.

> **Security.** `.conn_adt`, `.btp_service_key*.json`, and `.sap_sessions/` hold
> plaintext credentials/cookies and are in `.gitignore` — never commit them.

---

## YOLO mode (auto-approve)

By default aXet.code asks before running bash commands and file writes/deletes. **YOLO
mode** auto-approves every tool call. It's the interactive `-y` / `--yolo` flag on the
**root** command (verified against `axet-code --help`):

```bash
axet-code -y        # or: axet-code --yolo
```

> **Read-only SAP is unaffected either way.** YOLO removes the *approval prompt*, not the
> SAP guardrails — the read-only server still forces `ADT_READONLY=true` and refuses write
> tools. YOLO only auto-approves local bash/file actions, so use it **only in trusted,
> git-tracked workspaces**.

> ⚠️ **Agents:** the `-y` flag is **rejected by subcommands** — `axet-code run "..." -y`
> fails with `Unknown shorthand flag: 'y'`. YOLO is interactive-TUI only; never inject
> `-y` before `run`, `login`, `logout`, `logs`, `models`, `projects`, `stats`,
> `completion`, `dirs`, or `help` (the non-interactive `run` has no prompts to bypass).

### Safer alternative — auto-approve only some tools

There is no blanket config switch, but you can allowlist specific tools in
`axet-code.json` (global: `%LOCALAPPDATA%\axet-code\axet-code.json` on Windows,
`~/.axet-code/axet-code.json` on macOS/Linux; per-project: `.axet-code.json` in the
project root). Everything else still prompts:

```json
{
  "permissions": {
    "allowed_tools": ["view", "ls", "grep", "glob", "edit", "write", "bash", "fetch"]
  }
}
```

### Make YOLO the default (persistent)

Wrap the launcher so `-y` is injected for **interactive** launches only.

**macOS / Linux** (`~/.bashrc` or `~/.zshrc`, then `source` it):
```bash
axet-code() {
  local exe="$HOME/.local/bin/axet-code"   # adjust to your install path
  case "$1" in
    run|login|logout|logs|models|projects|stats|completion|dirs|help)
      command "$exe" "$@" ;;               # subcommand — no -y
    *) command "$exe" -y "$@" ;;           # interactive — inject -y
  esac
}
```

**Windows (PowerShell `$PROFILE`):** first allow local scripts to run (managed machines
ship `Restricted`, which silently blocks the profile), then add the wrapper:
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned -Force   # current-user only; no admin

if (-not (Test-Path $PROFILE)) { New-Item -ItemType File -Force -Path $PROFILE | Out-Null }
@'
function axet-code {
    $exe = "$env:LOCALAPPDATA\axet-code\bin\axet-code.exe"
    $subs = @('run','login','logout','logs','models','projects','stats','completion','dirs','help')
    if ($args.Count -gt 0 -and ($subs -contains $args[0])) { & $exe @args }
    else { & $exe -y @args }
}
'@ | Add-Content -Path $PROFILE -Encoding UTF8
. $PROFILE                                                    # reload; Get-Command axet-code -> Function
```

> If a corporate Group Policy overrides `CurrentUser` ExecutionPolicy, the wrapper can't
> load — just launch with `axet-code -y` each time instead.

---

## Available skills

Invoke with `%skill-name`.

### SAP (read-only)
| Skill | What it does |
|---|---|
| `%sap-adt-readonly` | Read SAP via ADT: source, SELECT-only SQL, search, ATC, syntax check, where-used, revisions, packages, transports, dumps. Starts the read-only HTTP server. |
| `%clean-core` | Clean Core / ABAP Cloud compatibility reference (knowledge, no SAP writes). |
| `%sap-docs` | SAP documentation search & reference (knowledge). |
| `%screen-gen` | Classic Dynpro screen reference — **inspection only** (generation disabled here). |
| `%fs-generator` | Author a SAP Functional Spec (FS) from analysis/requirements docs + your FS template: strictly grounded (no hallucination), Clean-Core-aware, asks clarifying questions when input is thin, tags gaps/suggestions, renders a branded PDF via `office-pdf`. Companion to `fs2ts`. Prompt by Dersim Tas. |
| `%fs2ts` | Convert a SAP Functional Spec (FS) into a Clean-Core Technical Spec (TS): extract the FS PDF, build a Gap List, apply the Clean Core decision tree, ask clarifying questions, emit a 5-part TS, and render a branded PDF via `office-pdf`. |

### abapGit delivery (developer-in-the-loop)
| Skill | What it does |
|---|---|
| `%abapgit-workflow` | Manual abapGit ZIP cycle: Claude edits `src/`, developer carries ZIPs to SAPGUI. The compliant way to *deliver* ABAP changes. |
| `%abapgit-export-zip` | Pack `src/` + `.abapgit.xml` into an abapGit-importable ZIP. |
| `%abapgit-import-status-zip` | Ingest SAPGUI status/error artifacts into `.abapgit-status/`. |
| `%abapgit-howto` | Print the SAPGUI walkthrough for the ZIP cycle. |

### Office documents
| Skill | What it does |
|---|---|
| `%office-excel-read` / `-write` / `-transform` / `-report` / `-compare` / `-images` | Profile, write, reshape, style-report, diff, and extract images from Excel/CSV. |
| `%office-slides` | Marp slide decks (PDF/PPTX/HTML) from tabular data. |
| `%office-pdf` | Markdown → branded PDF (headless Chromium). |
| `%office-pptx` | Native editable PowerPoint. |
| `%office-docx` | Markdown → native editable Word. |
| `%office-manual` | Step-by-step user manuals (Word/PPTX). |

> `office-pdf` / `office-pptx` / `office-docx` accept `--redact-pii` to mask TCKN/tax IDs
> (shared `office-tools/lib/redact.py`) before writing the file.

---

## Keeping up to date

```bash
cd ~/sap-toolkit && git pull    # or %USERPROFILE%\sap-toolkit on Windows
```

If you installed with **`--copy`** (the default), a `git pull` does **not** update the
projects — re-run the installer in each project to refresh the copied folders, then
restart aXet.code. If you used **link mode**, skills refresh automatically; you only
restart when skills were added or removed. Either way, restart the read-only SAP server
after a `git pull` that touched the `abaper/` engine.

---

## Verify installation

```bash
# skills linked into THIS project? (run from the project root — expect 21)
ls .axet-code/skills/                    # macOS/Linux
cmd /c dir ".axet-code\skills"           # Windows

# read-only SAP server serves 20 read tools and is flagged read-only:
python -c "import requests; print(requests.get('http://127.0.0.1:8787/health').json())"
# -> {"ok": true, "server": "abaper-sap-adt-readonly-http", "readonly": true, "tool_count": 20, ...}

# a write tool is refused:
python -c "import requests; print(requests.post('http://127.0.0.1:8787/tool/adt_push', json={}).status_code)"
# -> 404
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `NOT RUNNING` | Start `adt_readonly_server.py` with `run_in_background: true`. |
| `Connection refused` | Server not started, or wrong port (default 8787). |
| `401 Unauthorized` from a tool | Check `.conn_adt` credentials; VPN; run `adt_doctor`. |
| `404 unknown_tool` on a write | Expected — this toolkit is read-only. Use `%abapgit-workflow` to deliver changes. |
| `ModuleNotFoundError: mcp` (server) | `pip install -r requirements.txt` (the server imports the abaper engine → FastMCP). |
| `--redact-pii ... lib/redact.py not importable` | Run the office script by its **real** repo path in the clone, not the installed `.axet-code/skills` copy/link, so `../../../lib` resolves. |
| Skills not discovered | (1) They must be in the **project-level** `.axet-code/skills/` (not user-global). (2) aXet.code scans at **startup** — restart it in the project. (3) If still missing, the scanner isn't following links — re-run the linker with `--copy` / `-Copy` to install real folders. Confirm each entry has a `SKILL.md`. |
| `list skills` shows none but the folders exist | Same as above — almost always a missing **restart** (skills load at session start), or links the scanner skips (use `--copy`). |
| `mklink` fails (Windows) | Junctions (`/J`) work without admin on a local drive; across drives/UNC use Developer Mode or run PowerShell as Administrator. |
| Port 8787 in use | Start with `--port 8788` and use that port in your requests. |

---

## SAP API policy

SAP's API Policy v1.1 (May 2026) treats ADT APIs as SAP-internal and not permitted for
agentic AI workflows on business data. This toolkit is scoped accordingly:

- **SAP access here is READ-ONLY** and intended for **personal sandbox / R&D** systems.
- To **deliver** ABAP changes to any customer/production system, use the compliant
  **abapgit-workflow** path (manual abapGit ZIP cycle, each step executed by the
  developer) — never the SAP server.

By using the SAP read-only server you accept responsibility for compliance with your own
SAP agreement.

---

## License

**Proprietary — NTT DATA Business Solutions.** Copyright © 2026 NTT DATA Business
Solutions. All rights reserved. Adapted from the NTT ABAP Marketplace
(`abaper`, `abapgit-bridge`, `office-tools`) for aXet.code.
