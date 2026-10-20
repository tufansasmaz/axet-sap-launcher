---
name: clean-core
description: Check ABAP Cloud Clean Core compliance and release status for SAP objects, for a given SAP product and release (public cloud, BTP, Private Cloud / on-premise by S4CORE release) and for the project's Clean Core profile (public, s4-strict, s4-balanced, s4-legacy, ecc). Use when verifying if objects like MARA, BSEG, CL_GUI_ALV_GRID are allowed on this project, finding the successor of a not-released SAP object, or asking what a project's Clean Core profile permits.
version: 1.2.0
author: Claude Code
---

# ABAP Cloud Clean Core Checker

Answers, for a list of standard SAP objects: may this be used at this Clean Core
level, **on this product and release** — and says where the answer came from.

## The project's profile decides

A level is SAP's statement about an object. What the **project** does with it — use it,
use it with a written reason, list it, refuse it — is the project's **Clean Core
profile**, one line in the brief's front matter (`clean_core: s4-balanced`). The five
profiles, what each permits per level and per extension technique, the wording a
document uses for each decision, and what to do when the brief has no profile:
**[references/PROFILES.md](references/PROFILES.md)**. It is the single source for
`ts-generator`, `fs-generator`, `abap-code-review`, `abap-code-checker` and
`spec-reviewer`.

When the brief names a profile, call the checker with `--profile` instead of `--level`:

```bash
py <SCRIPTS_DIR>/clean_core_checker.py MARA EKKO BAPI_PO_CREATE1 --profile s4-balanced --s4core 109 --sp 1 --json
py <SCRIPTS_DIR>/clean_core_checker.py I_PRODUCT CL_SALV_TABLE --profile public --json
```

Each result then carries `decision` (`free`, `reason`, `approval`, `note`, `forbidden`,
`no_new`, `blocked`, `unverified`, `not_measured`) next to `verdict` and `verified`.
`--list-profiles` prints the table as JSON. A profile that does not fit the product
(`s4-legacy` with `--system-type public_cloud`) is refused, exit 2. On `ecc` nothing is
asked and nothing is claimed: SAP publishes no release list for ECC.

A **Public Cloud** project changes more than the object list:
[references/PUBLIC_CLOUD.md](references/PUBLIC_CLOUD.md).

## Data source & self-hosting

Release data comes from **ROSA** (Released Objects Search Assistant,
[github.com/ClementRingot/ROSA](https://github.com/ClementRingot/ROSA), MIT), which
wraps SAP's **official Cloudification Repository** — the source of truth for
released objects. The checker uses ROSA's public hosted instance by default; set
**`ROSA_BASE_URL`** to a self-hosted instance (`npx -y @rosa-mcp/server`, Docker,
or a BTP deployment via ROSA's own `mta.yaml`) when the public host is down or an
NTT-controlled endpoint is preferred. Only **standard SAP object names** are ever
sent — never customer Z/Y names or business data.

## Running it

The script is `<SCRIPTS_DIR>/clean_core_checker.py` (materialized installs name
`SCRIPTS_DIR` in a preamble at the top of this file; in a Claude Code plugin install it
is `${CLAUDE_PLUGIN_ROOT}/skills/clean-core/scripts`). One call for the whole list:

```bash
py <SCRIPTS_DIR>/clean_core_checker.py MARA EKKO SAP_WAPI_START_WORKFLOW
py <SCRIPTS_DIR>/clean_core_checker.py MARA,EKKO --system-type private_cloud --s4core 108 --sp 3
py <SCRIPTS_DIR>/clean_core_checker.py MARA --system-type private_cloud --version 2023_3 --level B --json
```

**Always pass the project's target** when a brief names one. Read it from the brief's
target platform: `--system-type` is `public_cloud`, `btp`, `private_cloud` or
`on_premise`; for the last two, `--s4core <release> --sp <support package>` (107 =
S/4HANA 2022, 108 = 2023, 109 = 2025) or `--version 2023_3` directly; `--profile` is
the brief's `clean_core` line, and without one `--level` is the highest acceptable Clean
Core level (default A = released APIs only; C and D are compared here, because the
endpoint answers for A when asked for them). Without a target
the answer is for **S/4HANA Cloud Public Edition** and the output says so — that answer
does not hold for a Private Cloud or on-premise project. A release the repository has no
list for is refused with the list it does have (exit 2) — pick the highest one not
above the system's support package.

## Reading the answer

Every object asked for appears, with one of three verdicts:

| verdict | meaning |
|---|---|
| `ALLOWED` | the repository puts it at or below the target level |
| `NOT ALLOWED` | the repository puts it above the target level; successors listed when SAP names any |
| `NOT VERIFIED` | nobody answered for this object on this target — it is **unknown**, not allowed |

Each run prints its **Source** line — `online` (ROSA, with the date) or `OFFLINE`
(the bundled snapshot and the date it was taken) — and its **Target** line. Offline,
the bundled snapshot can still say `NOT ALLOWED, unverified` for a few classic tables
it holds, and only for the public-cloud target it was taken for; it never says
`ALLOWED`, and everything else is `NOT VERIFIED`.

**For callers** (ts-generator, fs-generator, abap-code-checker): an object is verified
only when its `verified` field is `true` (JSON) — i.e. the repository answered online
for exactly this target. The exit code summarizes the run: **0** every object
verified, **3** at least one not verified (the report is complete either way), **2**
the request was wrong (unknown target, no objects). Anything not verified goes into a
document as *Doğrulanamadı*, never as a release claim.

## Clean Core levels (as the repository states them)

| Level | Typical state | Meaning |
|---|---|---|
| **A** | `released` | released API — usable in ABAP Cloud |
| **B** | `classicAPI` | classic API — allowed on Private Cloud / on-premise, not in ABAP Cloud |
| **C** | `notToBeReleased`, internal | not an API; read through the successor where one exists |
| **D** | `deprecated`, `noAPI` | do not use |

## Reference Documentation

| Topic | Reference |
|-------|-----------|
| **Profiles** | [references/PROFILES.md](references/PROFILES.md) — what a project does with each level; the single source for the document skills |
| **Public Cloud** | [references/PUBLIC_CLOUD.md](references/PUBLIC_CLOUD.md) — what replaces reports, Dynpros, exits and transports on `public` |
| **Clean Core Levels** | [references/CLEAN_CORE_LEVELS.md](references/CLEAN_CORE_LEVELS.md) |
| **Common Replacements** | [references/COMMON_REPLACEMENTS.md](references/COMMON_REPLACEMENTS.md) — worked examples; the successor the checker returns wins |
| **API Reference** | [references/API_REFERENCE.md](references/API_REFERENCE.md) |
