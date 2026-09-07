---
name: clean-core
description: Check ABAP Cloud Clean Core compliance and release status for SAP objects. Use when verifying if objects like MARA, BSEG, CL_GUI_ALV_GRID are allowed in ABAP Cloud, or finding replacement objects for deprecated/forbidden SAP objects.
version: 1.0.0
author: Claude Code
---

# ABAP Cloud Clean Core Checker

Check if SAP objects are released for ABAP Cloud development and find allowed replacements.

## Data source & self-hosting

Release data comes from **ROSA** (Released Objects Search Assistant,
[github.com/ClementRingot/ROSA](https://github.com/ClementRingot/ROSA), MIT), which
wraps SAP's **official Cloudification Repository** — the source of truth for
released objects. The checker uses ROSA's public hosted instance by default; set
**`ROSA_BASE_URL`** to a self-hosted instance (`npx -y @rosa-mcp/server`, Docker,
or a BTP deployment via ROSA's own `mta.yaml`) when the public host is down or an
NTT-controlled endpoint is preferred. Only **standard SAP object names** are ever
sent — never customer Z/Y names or business data. When no endpoint is reachable,
the built-in offline replacement table answers the common cases and says so.

## Usage

**Check object release status:**
```
"Is MARA released for ABAP Cloud?"
"Can I use CL_GUI_ALV_GRID in ABAP Cloud?"
```

**Find replacement objects:**
```
"What should I use instead of BSEG in ABAP Cloud?"
"Get successor for MARA table"
```

**Batch compliance check:**
```
"Check Clean Core compliance for: MARA, BSEG, CL_GUI_ALV_GRID"
```

## Common Forbidden Objects

| Object | Type | Use Instead |
|--------|------|-------------|
| MARA | Table | I_PRODUCT |
| BSEG | Table | (No direct replacement - use APIs) |
| CL_GUI_ALV_GRID | Class | CL_SALV_TABLE |
| CL_GUI_ALV_TREE | Class | CL_SALV_TREE |
| VBAK | Table | (No direct replacement) |
| T001 | Table | (No direct replacement) |

## Clean Core Levels

- **Level A** - Recommended (stable, well-tested)
- **Level B** - Allowed (standard SAP delivery)
- **Level C** - Conditionally allowed (check restrictions)
- **Level D** - Deprecated/forbidden (use replacement)

## Reference Documentation

Detailed reference materials:

| Topic | Reference |
|-------|-----------|
| **Clean Core Levels** | [references/CLEAN_CORE_LEVELS.md](references/CLEAN_CORE_LEVELS.md) |
| **Common Replacements** | [references/COMMON_REPLACEMENTS.md](references/COMMON_REPLACEMENTS.md) |
| **API Reference** | [references/API_REFERENCE.md](references/API_REFERENCE.md) |
