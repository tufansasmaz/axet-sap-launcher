# SAP Toolkit for aXet.code

**SAP inspection (and, on DEV only, development) + abapGit delivery + Office document
automation — packaged as aXet.code skills.**

This repo adapts the NTT plugins into **skills** that work in **aXet.code** (NTT DATA's
Crush-based CLI coding assistant). aXet.code has **no plugin/marketplace system** and
**cannot use MCP**, so:

- SAP ADT is reached over a **localhost HTTP server** (the MCP workaround). **Two servers
  ship here and exactly one runs at a time** — see below.
- **abapGit** delivery and **Office** document skills are plain Python scripts and run
  as-is.

> **If you are an aXet.code agent** setting this up: jump to
> [Agent Self-Installation](#agent-self-installation). Then, before any SAP call, read
> [The read-only SAP server](#the-read-only-sap-server).

---

## ⚠️ AGENT: READ THIS FIRST — SAP over HTTP, and which surface you have

> **If the user wants to work with SAP:**
>
> 1. **NEVER run the Python scripts directly.** Talk to the HTTP server on
>    `http://127.0.0.1:8787`. A direct script call spawns a fresh SAP session per call and
>    bypasses every gate below.
> 2. **Do not assume you can write, and do not assume you cannot.** Two servers exist:
>
>    | Server | Tools | Runs when |
>    | --- | --- | --- |
>    | `sap-adt/scripts/adt_mcp_server.py` | 33, incl. `adt_push` / `adt_activate` / `adt_create*` | **teknik danışman rolü + `ADT_SAP_TIER=DEV`** |
>    | `sap-adt-readonly/scripts/adt_readonly_server.py` | 17 read tools; writes return `404 unknown_tool` | every other case — modül danışmanı in any system, and QA/PRD **or an unmarked system** for anyone |
>
>    **`GET /health` names the surface and lists the tools.** Ask it; never guess.
> 3. **Even with the write surface up, the engine has its own gate.** `guardrails.py`
>    reads `ADT_SAP_TIER` from `.conn_adt` and refuses every write outside `DEV` with
>    `GR_TIER`. An unmarked system counts as non-DEV.
> 4. **Never write to SAP without a named human's approval and a transport they
>    confirmed.** That rule is older than the gates and survives them.
> 5. If the user asks to deliver changes to **QA or production**, that is a transport, not
>    an `adt_push` — or the **abapgit-workflow** skill (manual abapGit ZIP cycle,
>    developer-in-the-loop).

**Quick check + start (background):**
```bash
# Is it up, and which surface?
python -c "import requests; print(requests.get('http://127.0.0.1:8787/health').json())" 2>/dev/null || echo "NOT RUNNING"

# Start it (run_in_background: true). Point ADT_CWD at the folder holding .conn_adt.
# Windows uses 'py'; macOS/Linux uses 'python3'.
# Read-only surface — NOTE: --http is mandatory, without it the script speaks MCP stdio.
ADT_CWD=$(pwd) py "<sap-toolkit>/sap-consultant/skills/sap-adt-readonly/scripts/adt_readonly_server.py" --http --port 8787

# Write surface (DEV only, technical consultant only)
ADT_CWD=$(pwd) py "<sap-toolkit>/sap-consultant/skills/sap-adt/scripts/adt_mcp_server.py" --http --port 8787

# Verify SAP auth
python -c "import requests; r=requests.post('http://127.0.0.1:8787/tool/adt_logon', json={}); print(r.json())"
```

Replace `<sap-toolkit>` with wherever this repo was cloned.

> **In NTT Studio you never run these by hand.** The launcher picks the server from the
> role + tier and starts it. The commands above are for standalone use of this toolkit.
> The wrapper **imports the engine from its sibling folder** (`../sap-adt/scripts`) and
> refuses to start if it is missing — keep the two folders side by side.

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

| Source plugin | What it brings | SAP access | Needs the HTTP server? |
|---|---|---|---|
| **sap-consultant** | the ADT engine + its wrapper, plus the analysis, spec, incident and CR skills | read, and write on DEV | ✅ for anything `adt_*` |
| **abapgit-bridge** | `abapgit-workflow`, `abapgit-export-zip`, `abapgit-import-status-zip`, `abapgit-howto` | none (developer carries ZIPs) | ❌ |
| **sapgui-scriptter** | SAP GUI screenshots and the abapGit deploy loop | drives the real GUI — see its own rules | ❌ |
| **office-tools** | `office-excel-*`, `office-slides`, `office-pdf`, `office-pptx`, `office-docx`, `office-manual` | n/a | ❌ |
| **axet-flows**, **celonis**, **sap-datasphere**, **sap-ecosystem**, **ntt-s4-migrator**, **ntt-atc-batch-remediator** | their own skills, as-is | varies | ❌ |

**The authoritative list is not this table.** Which skills exist is
`toolkit-version.json` (content-hashed, one entry per skill); **which skills a given
project gets** is `SKILL_CATALOG` + `PROFILE_SKILLS` in the launcher's
`app-electron/main/skillProfiles.ts`, and that answer depends on the consultant's role.
A module consultant never receives the skills that write to SAP — not `sap-adt`, not
`screen-gen`, not `adobe-gen`, not `sap-object-transfer`, not `abapgit-deploy`.

> **Where skills are installed.** aXet.code scans the **project-level**
> `.axet-code/skills/` directory (relative to the folder you launch it in) — **not** a
> user-global one — and it discovers them at **startup**. Clone this repo once to a stable
> location, then run the installer inside **each project** where you want the skills
> (default is `--copy`, which drops real folders the scanner always finds), and **restart
> aXet.code**. See [Agent Self-Installation](#agent-self-installation).

Repo layout (each `skills/<name>` folder is installed into a project's `.axet-code/skills/`):
```
sap-toolkit/
├── sap-consultant/skills/{sap-adt, sap-adt-readonly, sap-adt-router-bridge, clean-core, sap-docs, abap-code-checker, abap-code-review, sap-incident, sap-cr-scope, sap-cr-handover, fs-generator, ts-generator, ...}/
│   ├── sap-adt/scripts/adt_mcp_server.py                 # the engine, 33 tools (DEV only)
│   ├── sap-adt-readonly/scripts/adt_readonly_server.py   # the wrapper, 17 tools — imports the engine next door
│   ├── fs-generator/scripts/{extract_pdf.js, render_pdf.py}  # requirements → FS → branded PDF
│   └── ts-generator/scripts/{extract_pdf.js, merge_and_pdf.py}  # FS→TS: PDF in, branded PDF out
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
- **Node.js 18+** — for `office-slides --render` (Marp) and `ts-generator` PDF extraction
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
for p in sap-consultant/skills/sap-adt-readonly sap-consultant/skills/clean-core \
         sap-consultant/skills/sap-docs sap-consultant/skills/screen-gen sap-consultant/skills/ts-generator \
         sap-consultant/skills/fs-generator \
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
holds **one persistent SAP session**. This repo ships **two entrypoints over one engine**
— there is no second copy of the engine, because a fork is how a read-only server quietly
becomes a different server with the same name.

| Entrypoint | Surface | Default port |
|---|---|---|
| `sap-consultant/skills/sap-adt/scripts/adt_mcp_server.py` | the engine's full 33 tools | 8787 |
| `sap-consultant/skills/sap-adt-readonly/scripts/adt_readonly_server.py` | 17, and never a write | 8790 |

The launcher starts whichever one the role and the tier call for, always on **8787**.

### The read-only wrapper's two locks

| Lock | Mechanism |
|---|---|
| **Belt** | It forces `ADT_READONLY=true` into the environment before the engine loads, so every write path (`push`/`create`/`activate`/`delete`/…) refuses with `GR_READONLY`. |
| **Suspenders** | The 13 tools that can write are **removed from the registry before the transport starts**, so they are neither listed nor callable: `POST /tool/adt_push` → `404 unknown_tool`. Unsetting `ADT_READONLY` afterwards does not bring them back — they do not exist in that process. |

Belt alone would not be enough: with the write tools still advertised, the model plans a
push, spends the turn on it, and only then learns it was refused.

**Surface: 17 tools on install, 20 with all three gates open.** Three read tools are
gated behind their own variable because "read-only" reads as "harmless" and these are not:

| Tool | Variable | Why gated |
|---|---|---|
| `adt_unit_test` | `ADT_RO_ALLOW_UNIT_TEST` | executes ABAP on the target; a badly isolated test can commit |
| `adt_sql` | `ADT_RO_ALLOW_SQL` | business and personal data, any table the SAP user can see |
| `adt_dumps` | `ADT_RO_ALLOW_DUMPS` | short-dump text, which carries field values |

**Drift pin:** every tool the engine registers must be classified in the wrapper. A tool
added upstream and left unclassified makes the read-only server **refuse to start**,
naming it — so a new write tool can never silently inherit "exposed".

### The third gate, on both surfaces

`guardrails.py` reads `ADT_SAP_TIER` from `.conn_adt` and refuses every write outside
`DEV` with `GR_TIER`. **An unmarked system is treated as non-DEV.** This gate does not
know which role is running, which is why the role decision is taken when the server is
chosen, not here.

**Endpoints:** `GET /health` · `GET /tools` · `POST /tool/<name>` (JSON kwargs body).
**Optional auth:** set `ABAP_HTTP_TOKEN` to require `Authorization: Bearer <token>`.

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
run once: `python sap-consultant/skills/sap-adt-readonly/scripts/login_saml_sso.py`.

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

> **The SAP gates are unaffected either way.** YOLO removes the *approval prompt for
> local bash/file actions*; it does not touch which server is running, which tools that
> server registers, or `guardrails.py`'s tier check. What it does remove is the pause
> before a write the write surface allows — so on a DEV system with the write surface up,
> YOLO means `adt_push` runs the moment you decide to call it. Use it **only in trusted,
> git-tracked workspaces**, and keep confirming the transport with a human.

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

### SAP
| Skill | What it does |
|---|---|
| `%sap-adt` | The full ADT surface, 33 tools. **Installed only for the technical-consultant role, and only serves writes on a `DEV` system.** |
| `%sap-adt-readonly` | The same engine behind a surface that cannot write: source, SELECT-only SQL, search, ATC, syntax check, where-used, revisions, packages, transports, dumps. |
| `%clean-core` | Clean Core / ABAP Cloud compatibility reference (knowledge, no SAP writes). |
| `%sap-docs` | SAP documentation search & reference (knowledge). |
| `%screen-gen` | Classic Dynpro screen generation. **Technical consultant only** — it writes. |
| `%fs-generator` | Author a SAP Functional Spec (FS) from analysis/requirements docs + your FS template: strictly grounded (no hallucination), Clean-Core-aware, asks clarifying questions when input is thin, tags gaps/suggestions, renders a branded PDF via `office-pdf`. Companion to `ts-generator`. Prompt by Dersim Tas. |
| `%ts-generator` | Convert a SAP Functional Spec (FS) into a Clean-Core Technical Spec (TS): extract the FS PDF, build a Gap List, apply the Clean Core decision tree, ask clarifying questions, emit a 5-part TS, and render a branded PDF via `office-pdf`. |

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
after a `git pull` that touched the `sap-consultant/` engine.

---

## Verify installation

```bash
# skills linked into THIS project? (run from the project root — expect 21)
ls .axet-code/skills/                    # macOS/Linux
cmd /c dir ".axet-code\skills"           # Windows

# which surface is on 8787? read `server` and `tool_count`, never assume:
python -c "import requests; print(requests.get('http://127.0.0.1:8787/health').json())"
# read-only  -> {"ok": true, "server": "abaper-sap-adt-readonly-http", "readonly": true, "tool_count": 17, ...}
# write      -> the full engine, 33 tools

# on the read-only surface a write tool is refused:
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
| `404 unknown_tool` on a write | The **read-only** surface is up — expected for a module consultant, and for anyone on QA/PRD or an unmarked system. Not a fault, and not something to work around: deliver the diff, or use `%abapgit-workflow`. |
| `GR_TIER` refusal on the write surface | The server is the full engine but `.conn_adt` does not say `ADT_SAP_TIER=DEV`. Ask the user what the system is; never edit the tier to get past a refusal. |
| `ModuleNotFoundError: mcp` (server) | `pip install -r requirements.txt` (the server imports the vendored ADT engine → FastMCP). |
| `--redact-pii ... lib/redact.py not importable` | Run the office script by its **real** repo path in the clone, not the installed `.axet-code/skills` copy/link, so `../../../lib` resolves. |
| Skills not discovered | (1) They must be in the **project-level** `.axet-code/skills/` (not user-global). (2) aXet.code scans at **startup** — restart it in the project. (3) If still missing, the scanner isn't following links — re-run the linker with `--copy` / `-Copy` to install real folders. Confirm each entry has a `SKILL.md`. |
| `list skills` shows none but the folders exist | Same as above — almost always a missing **restart** (skills load at session start), or links the scanner skips (use `--copy`). |
| `mklink` fails (Windows) | Junctions (`/J`) work without admin on a local drive; across drives/UNC use Developer Mode or run PowerShell as Administrator. |
| Port 8787 in use | Start with `--port 8788` and use that port in your requests. |

---

## SAP API policy

SAP's API Policy v1.1 (May 2026) treats ADT APIs as SAP-internal and not permitted for
agentic AI workflows on business data. This toolkit is scoped accordingly:

- **Writing is confined to DEV**, and to the technical-consultant role, by three
  independent gates (which skills are installed, which server is started, and the
  engine's own tier check). Everywhere else the surface cannot write at all.
- **QA and production are reached by transport, never by `adt_push`.** A direct write
  desynchronises the system from the request that is supposed to describe it.
- To **deliver** ABAP changes to any customer/production system, use the compliant
  **abapgit-workflow** path (manual abapGit ZIP cycle, each step executed by the
  developer) — never the SAP server.
- Every write needs a **named human's approval and a transport they confirmed**. That
  rule is not one of the three gates; it is the one the gates cannot enforce for you.

By using this toolkit you accept responsibility for compliance with your own SAP
agreement.

---

## License

**Proprietary — NTT DATA Business Solutions.** Copyright © 2026 NTT DATA Business
Solutions. All rights reserved. Adapted from the NTT ABAP Marketplace
(`sap-consultant`, `abapgit-bridge`, `office-tools`) for aXet.code.
