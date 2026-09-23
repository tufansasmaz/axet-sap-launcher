---
name: abapgit-deploy
description: >
  Autonomous SAP deploy-fix-iterate loop via SAPGUI COM scripting (Windows only). Always use
  this skill when the developer wants Claude to drive the full deploy cycle: Claude edits src/,
  prints SAPGUI commands for the developer to run with !, reads activation errors from
  .abapgit-status/, and loops until green — without the developer touching SAPGUI manually.
  Triggers: "deploy to SAP", "run the SAPGUI script", "automate the import", "activate for me",
  "drive ZABAPGIT_STANDALONE", "bootstrap SAP package". Composes with abapgit-bridge:
  /abapgit-export-zip packs locally; this skill imports and activates via SAPGUI scripting.
---

# abapgit-deploy

This skill teaches Claude how to drive the **autonomous deploy loop** via SAPGUI scripting. The developer asks for a feature; Claude edits the source, deploys, watches activation, fixes errors, iterates - all without the developer touching SAPGUI.

## Hard rule: agent prints, developer runs (every SAPGUI command)

SAP's API usage policy (April 2026) permits agent-driven SAPGUI scripting **only when the developer has explicitly approved that specific run**. To comply unambiguously, this plugin uses a stricter rule: **Claude never invokes the SAPGUI-driving scripts itself.** The developer runs each one by hand.

Mechanically, that means: Claude prepares everything (edits `src/`, packs the ZIP, drafts the command line), then **prints the exact command for the developer to execute** in their own Claude Code prompt. The developer pastes it with the `!` shell prefix and runs it. Claude then reads `.abapgit-status/<latest>` (read-only) and proposes the next step.

For ANY SAPGUI-driving script (`skills/abapgit-deploy/scripts/abapgit_deploy.py`, `skills/abapgit-deploy/scripts/abapgit_bootstrap.py`, `skills/abapgit-deploy/scripts/gui_*.py`), Claude MUST:

1. **State plainly what is about to happen**, including:
   - The action (`bootstrap`, `deploy`, single-step diagnostic, etc.)
   - The target SAP system / connection (e.g. `NPL` from `.conn_adt`)
   - The SAP **package** that will be touched
   - The offline repo name
   - The transport request, if relevant
   - For deploy: the source files staged and the commit message
   - For bootstrap: the destination `src/` path
2. **Print the exact command** in a fenced block, ready for the developer to paste with `!`. Example:
   ```
   !python plugins/sapgui-scriptter/skills/abapgit-deploy/scripts/abapgit_deploy.py \
     --offline-repo zgit-test --package ZGIT_TEST \
     --transport NPLK900081 -m "feat(zcl_greetings): add farewell method"
   ```
3. **Stop and wait.** Do not run the command yourself. Do not run the slash command. Do not call any `gui_*.py` script via Bash or any other tool.
4. **When the developer reports completion** (or `.abapgit-status/<latest>` shows up), read the status file and report green/fail. On fail, edit `src/`, then go back to step 1 and print the next round's command.

Each round of the fix loop is a new SAPGUI run, so each round gets its own printed command. Round 2 doesn't piggy-back on round 1's execution — Claude prints round 2's command and waits for the developer to run it.

If the developer says "just run it" or "go ahead, you run it", politely explain the policy and decline. The April 2026 rule is the agent doesn't drive SAPGUI; the workaround is the developer drives, even when they're impatient. This is not negotiable per-run.

This rule does **not** apply to:
- **File edits** in `src/` and elsewhere (local, no SAP contact).
- **Reading `.abapgit-status/`** to inspect deploy results.
- **`/abapgit-export-zip`** (Git commit + ZIP packing only, no SAPGUI).
- **Diagnostics that don't drive SAPGUI** (e.g., reading `.conn_adt`, listing files).

Claude may run those freely.

## When to use this skill

- The developer's workstation runs Windows with SAPGUI for Windows
- SAP GUI Scripting is enabled (server profile + client setting)
- **SAP GUI file access is pre-allowed** for the workstation's project / dist directories — see "SAP GUI Security: file access" below
- The developer is already logged in to the target SAP system in a SAPGUI session
- The `abapgit-bridge` plugin is installed (provides `/abapgit-export-zip`)
- An abapGit offline repo exists in `ZABAPGIT_STANDALONE`, bound to the SAP package

If any of those are missing, fall back to `abapgit-bridge`'s manual cycle (`/abapgit-export-zip` + `/abapgit-howto` + `/abapgit-import-status-zip` — those are read-only / local-only and the agent may invoke them).

## Bootstrap: pulling code FROM SAP into `cwd`

Before Claude can edit ABAP, the source has to be in the workspace as files. There are two starting states:

**State A — `cwd` already has `src/` populated** (e.g., a prior bootstrap or a fresh git clone). Skip bootstrap; go straight to edit + the deploy command.

**State B — `cwd` has no `src/`** (or no `.abapgit.xml`, or the user is starting from an empty folder and asks Claude to "fix the log viewer in ZGIT"). Bootstrap is required.

### The "ask the package name" rule

**MUST ASK FIRST.** When the user requests work on ABAP code and the workspace is empty, Claude does NOT guess the SAP package name. Claude asks:

> "Which SAP package should I pull from? (e.g., `ZGIT`, `ZFI`, `ZSD`)"

Only after the user replies with a concrete package name does Claude proceed. Inferring the package from a class name prefix, a previous session, or anything else is forbidden — packages are governance boundaries on SAP and the wrong one means changes land in the wrong transport / wrong owner / wrong layer.

If the user mentions both the file and the package in one breath ("fix `ZGIT_TEST_R_LOG_VIEWER` in `ZGIT_TEST`"), no need to ask — they've named it.

### Bootstrap flow

Once a package name is in hand, declare what you're about to do and print the command for the developer to run:

```
!python plugins/sapgui-scriptter/skills/abapgit-deploy/scripts/abapgit_bootstrap.py --package ZGIT
```

What this does:
1. Verifies the package exists on SAP via ADT.
2. Checks if an abapGit offline repo is already bound to that package.
3. **If not:** creates one (companion program SUBMITs to ZABAPGIT_STANDALONE in headless create-offline-repo mode).
4. Drives ZABAPGIT_STANDALONE in SAPGUI to **export the package contents to a ZIP**.
5. Saves the ZIP under `<cwd>/.abapgit-tmp/<package>-<UTC>.zip`.
6. Unpacks into `<cwd>/src/`, preserving abapGit's filename conventions.
7. Prints a summary (object count, package, where files landed).

After bootstrap, `cwd` looks like a normal abapGit-managed workspace and the deploy loop applies as usual.

### Stop conditions during bootstrap

- Package doesn't exist on SAP → tell the user, ask if they typed the name correctly.
- Package exists but is empty → bootstrap creates `src/` empty, prints a notice; user can start adding new objects.
- Package exists but has no offline repo AND user doesn't want to create one → abort, tell the user.

## SAP GUI Security: file access (must be pre-allowed)

The auto-deploy mode in `ZABAPGIT_STANDALONE` reads the ZIP from disk via `cl_gui_frontend_services=>file_upload`. SAP GUI intercepts that call and shows a **"SAP GUI Security"** popup asking the user to **Allow** or **Deny** access to the file path. Until the user dismisses the popup, the auto-deploy hangs waiting.

For autonomous deploy (no human in the loop), this popup MUST be dealt with **once, in advance**:

**Important:** ticking "Remember My Decision" on the popup ALONE doesn't persist across SAPGUI restarts. You must configure the Security Module:

**Option A — Customized + Default Allow (recommended for dev workstations):**
1. SAP Logon → **Options** → **Security** → **Security Configuration**
2. Set **Status: Customized** (top-right dropdown of the Security Module pane)
3. Click **Open Security Configuration**
4. Set **Default Action: Allow**
5. Click **OK**

After this, SAP GUI no longer prompts for file access — autonomous deploy runs through cleanly.

**Option B — Customized + per-path rules (recommended for shared workstations):**
1. Steps 1–3 as above
2. Set **Default Action: Ask** (or **Deny**)
3. In the **Security Rules** table, add:
   - Object: `<project root>` (e.g. `D:\cabs\workspace\NTT\GLOBAL\ntt-claude-marketplace`)
   - Type: `Directory`
   - Access types: `Read` (and `Write` if writing logs back)
   - Action: `Allow`, State: `Enabled`
4. Click **OK**

This pre-allows just the project tree without opening file access globally.

**Option C — On a corporate workstation:**
- Basis team pushes a SAP GUI security profile that pre-allows specific paths
- The user / agent never has to touch the Security Configuration dialog

**Diagnostic message Claude should give if the deploy hangs:**

> "The deploy is waiting for a SAP GUI Security dialog. Look at your SAPGUI window for an unanswered Allow/Deny prompt. To prevent this in future: SAP Logon → Options → Security → Security Configuration → Status: Customized → Default Action: Allow."

If the agent detects the deploy hanging at step 4 (auto-deploy mode), the most likely cause is the security popup. Tell the user to look at their SAP GUI window for an unanswered Allow/Deny dialog.

## The autonomous loop

```
User: "Add a method `farewell` to ZCL_GREETINGS"
   ↓
Claude: edits src/zcl_greetings.clas.abap + .clas.xml
Claude: prints the deploy command for the developer to paste with `!`:
        !python plugins/sapgui-scriptter/skills/abapgit-deploy/scripts/abapgit_deploy.py \
          --offline-repo my-zfoo --package ZAI_FOO \
          -m "feat(zcl_greetings): add farewell method"
   ↓
Developer runs the command in their prompt.
   ↓
   [export step]   commit + dist/<repo>-<sha>.zip
   [SAPGUI step]   open ZABAPGIT, import ZIP, stage, commit, SE80 activate
   [capture step]  if activation OK -> exit 0; if FAIL -> .abapgit-status/<UTC>-deploy-<pkg>.txt
   ↓
Claude reads the result.
If exit 1: reads .abapgit-status/<latest>, proposes a fix in src/, prints round-2 command
If exit 0: reports green, done
```

## How Claude should drive the loop

When the user says "deploy", "ship", "make it green", or similar:

1. **Make sure the prerequisites pass**: ask the user to confirm SAPGUI is open and logged in. If not, fall back to manual cycle.
2. **Compose the deploy command**: derive `--offline-repo` from project context, `--package` from the SAP package the repo targets, `-m` from a Conventional Commits message reflecting the change.
3. **Declare and print the command for the developer to run** (per the "Hard rule" section above). Example:
   > "Files staged: `src/zcl_greetings.clas.abap`, `src/zcl_greetings.clas.xml`. Run this in your prompt (paste with the `!` prefix):
   > ```
   > !python plugins/sapgui-scriptter/skills/abapgit-deploy/scripts/abapgit_deploy.py --offline-repo zgit-test --package ZGIT_TEST --transport NPLK900081 -m "feat(zcl_greetings): add farewell method"
   > ```
   > Target system: `NPL`. Tell me when it finishes."
4. **Wait.** Do not run the command yourself. The developer executes it.
5. **When the developer reports back** (or `.abapgit-status/` shows a fresh entry):
   - **Exit 0** → report success with the commit SHA and transport (if visible).
   - **Exit 1** →
     a. Read `.abapgit-status/<latest>` (the deploy script just wrote it).
     b. Parse the error — which object, which line, which type of error.
     c. Edit `src/` to fix.
     d. **Print the round-2 command** (short form is fine: "Round 2: same system/repo/package, fix message `fix(...): ...`. Run:" + the command), then wait again.
6. **Bound the loop**: stop after 3 failed rounds OR if the same error repeats twice (suggests an unfixable upstream issue — dependency missing, type mismatch outside Z scope, etc.). Tell the user.

There is no "blanket approval" shortcut: every round needs its own printed command, because every round is a separate developer-executed run.

## Stop conditions (do NOT iterate further)

- Same error appears twice in a row → tell the user, don't loop
- Error references an object outside the repo's scope (e.g., a missing standard SAP type) → tell the user
- 3+ rounds without progress → tell the user
- Lock or transport conflict → tell the user (that's a coordination problem, not a code problem)
- User says "stop" / "wait" / interrupts

## NEVER use ADT to deploy customer ABAP code

**Hard rule.** ADT REST (i.e., `sap-consultant/sap-adt`'s `adt_push`, `adt_create`, `adt_activate`) is **off-limits for deploying user/customer ABAP code through this plugin**. The whole point of the abapgit-bridge family is that customer code flows through Git and abapGit, not through ADT.

ADT is permitted for exactly one narrow purpose:

- **Iterating on `docs/sources/zabapgit_standalone.prog.abap` on the developer's own dev VM** — i.e., the maintainer of this plugin pushing patched-standalone source to their personal NPL/Sandpit system to test the changes. The dev VM is owned by the developer; they are the basis team there; ADT is a personal productivity tool.

ADT is **never** used:

- On a client / customer / shared-dev SAP system — even for editing standalone. Clients install the (committed) standalone source via SE38 paste, or via their own abapGit's bootstrap path. The plugin never reaches into a client SAP via ADT.
- For any customer ABAP code (anything in their `src/`). That always flows through `/abapgit-export-zip` + abapGit Standalone Import ZIP.

When the standalone modification matures and ships, customers receive it as a committed file in the marketplace repo (`docs/sources/zabapgit_standalone.prog.abap`). They install it the same way they installed v1.133.0: download the file, paste into SE38, activate. No ADT, no plugin reaching into their SAP.

For the deploy of customer code (ZGIT_TEST objects, anything in src/, etc.), the path is **always**:

```
Claude edits src/*.abap
  ↓
/abapgit-export-zip                       (commit + ZIP)
  ↓
ZIP imported via ZABAPGIT_STANDALONE      (driven by SAPGUI scripting once
                                           the auto-deploy mode lands; manual
                                           via /abapgit-howto until then)
  ↓
SE80 activate                             (driven by SAPGUI scripting)
```

If a v0.x of this plugin ever calls sap-consultant/sap-adt scripts to push customer source, **that's a bug** and should be removed.

## NEVER change customer SAP server settings

**Hard rule.** This plugin requires `sapgui/user_scripting = TRUE` in the SAP profile to function. If that flag is not set on the target system:

- **Never** SSH into the SAP server and edit `DEFAULT.PFL` yourself.
- **Never** call `stopsap` / `startsap` to make a profile parameter take effect.
- **Tell the user.** The flag has to be set by the customer's basis team, with their change-control process. It's a system-wide setting that affects all users of that SAP system, not just our plugin's session.

If `DisabledByServer = True` after attaching to a connection, fall back to the manual cycle (`abapgit-bridge`'s `/abapgit-export-zip` + `/abapgit-howto`) and report:

> "SAP GUI Scripting is disabled on the server (DisabledByServer=True). Your basis team needs to add `sapgui/user_scripting = TRUE` to the system's DEFAULT profile and restart SAP. Until then, use the manual cycle: `/abapgit-export-zip` then take the ZIP to SAPGUI per `/abapgit-howto`."

The local NPL VM (developer-owned, used for plugin development) is the only environment where the agent may modify SAP settings, and only with the developer's explicit consent. Production / customer / shared dev systems are off-limits.

The same rule applies to:
- Profile parameters (any change to `DEFAULT.PFL` or instance profiles)
- Transport routes / paths
- RFC destinations
- ICM service activation in SICF
- Authorisation profiles or roles
- Any `STMS` / `SCC4` / `SE06` configuration

If the plugin needs any of these to work, the agent's job is to *document* what's needed and *ask the user / basis team* to provide it. Never to make the change.

## Conversation shape

**User:** "Add a method `farewell` to `ZCL_GREETINGS` that returns 'Goodbye, {name}', then deploy."

**Claude:**
1. Reads `src/zcl_greetings.clas.abap` + `.clas.xml`
2. Adds method declaration + implementation
3. **Declares + prints the command**:
   > "Edits ready for `src/zcl_greetings.clas.abap` (+ `.clas.xml`). Target system: `NPL`. Run this in your prompt:
   > ```
   > !python plugins/sapgui-scriptter/skills/abapgit-deploy/scripts/abapgit_deploy.py --offline-repo zgit-test --package ZGIT_TEST --transport NPLK900081 -m "feat(zcl_greetings): add farewell method"
   > ```
   > Tell me when it finishes."
4. **Waits.** Developer pastes the command, runs it, reports back (or just leaves `.abapgit-status/` updated).
5. Claude reads `.abapgit-status/<latest>`. If exit 0: "ZCL_GREETINGS::farewell deployed and active. Commit a235f18."
6. If exit 1: reads the captured log, proposes a fix in `src/`, **prints the round-2 command**, waits again.

## How parameters reach the standalone (no companion program)

Only ONE ABAP file is installed on the customer SAP system: `ZABAPGIT_STANDALONE` (the patched version). It carries hidden agent-mode parameters on its selection screen — `P_AGENT`, `P_REPO`, `P_ZIP`, `P_MSG`, `P_TRK`, `P_ACT` (deploy) and `P_BOOT`, `P_PKG`, `P_OUT` (bootstrap). Each is rendered as `screen-invisible = 1` in `AT SELECTION-SCREEN OUTPUT`, so:

- Interactive users see an empty selection screen briefly, then the upstream HTML UI (visible UX unchanged from upstream abapGit).
- SAPGUI scripting reaches the same parameters as `pwdP_*` (GuiPasswordField) controls — writeable but not readable, which is fine because we only need to set them.

Earlier versions used a separate `ZAI_DEPLOY` companion program. That has been retired (v0.5+). If you find references to it, they're stale.

## Limitations Claude should be aware of

1. **Windows-only.** Linux/Mac developers can't use this; offer manual cycle instead.
2. **abapGit HTML driving is fragile.** If `gui_import_zip.py` reports it can't find a sapevent or HTML field, fall back: ask the developer to do steps 4-5 manually, then have Claude run only `gui_activate_package.py` for step 6.
3. **No automatic transport assignment.** If abapGit prompts for a transport mid-deploy, the script doesn't fill it - ask the developer to set a default modifiable transport for their user, or pause for manual TR pick.
4. **Capture format is text, not JSON.** The .abapgit-status file written by deploy is the raw SE80 log; Claude reads loosely.

## Screenshots & user manuals → see the `sapgui-screenshots` skill

Capturing SAP GUI screens and building step-by-step user manuals now lives in the
sibling **`sapgui-screenshots`** skill (`plugins/sapgui-scriptter/skills/sapgui-screenshots/`).
It does preflight capability detection (clean scripting → enable temporarily →
WebGUI+Playwright), a batched navigate-and-capture driver (`gui_navigate_capture.py`),
and hands a manifest to office-tools' `office-manual` for docx/pptx/pdf output.

`take_screenshot.py` (this skill) remains the **single-shot** capture primitive,
since it shares the `sap_gui_lib` scripting core with the deploy scripts:

| Flag | Default | Meaning |
|---|---|---|
| `--output` | *(required)* | PNG output path (directories created automatically) |
| `--method` | `auto` | `hardcopy` (SAP GUI HardCopy via scripting engine), `window` (OS-level Win32 `PrintWindow` grab + `PIL.ImageGrab` fallback), or `auto` |
| `--window-title` | *(derived)* | Title substring to locate the window for `--method window` |
| `--conn` / `--sess` / `--window` | 0 | Connection / session / window index (HardCopy) |

`hardcopy` is cleanest but needs a scriptable DIAG session; `window` works even
when scripting is off (needs `pywin32` + `Pillow`). For a WebGUI/Fiori system there
is no classic window — use a browser screenshot.

## See also

- `skills/sapgui-screenshots/` (this plugin) — preflight + batched navigate/capture + user manuals.

- `skills/abapgit-deploy/scripts/abapgit_bootstrap.py` (this plugin) — pulls code FROM SAP into `cwd`. Agent prints the `!python …` command; developer runs it.
- `skills/abapgit-deploy/scripts/abapgit_deploy.py` (this plugin) — pushes edits from `cwd` back TO SAP. Agent prints the `!python …` command; developer runs it.
- `skills/abapgit-deploy/scripts/take_screenshot.py` (this plugin) — captures the current SAPGUI window to PNG. Agent prints the `!python …` command; developer runs it.
- `/abapgit-export-zip`, `/abapgit-import-status-zip`, `/abapgit-howto` (abapgit-bridge plugin) — local/read-only, agent may invoke directly.
- `abapgit-workflow` skill (abapgit-bridge plugin) — the manual cycle and folder-layout conventions still apply.
- `office-manual` skill (office-tools plugin) — assembles screenshots + step descriptions into a Word/PPTX user guide.
- `ATTRIBUTION.md` — credits zscripter for the SAP GUI scripting primitives.
