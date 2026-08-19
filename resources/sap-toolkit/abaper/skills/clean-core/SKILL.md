---
name: clean-core
description: Check ABAP Cloud Clean Core compliance and release status for SAP objects. Use when verifying if objects like MARA, BSEG, CL_GUI_ALV_GRID are allowed in ABAP Cloud, or finding replacement objects for deprecated/forbidden SAP objects.
version: 1.0.0
author: Claude Code
---

# ABAP Cloud Clean Core Checker

Check if SAP objects are released for ABAP Cloud development and find allowed replacements.

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
