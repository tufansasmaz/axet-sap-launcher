# ABAP Cloud Clean Core Levels

Understanding Clean Core levels for SAP object compliance.

## Clean Core Level System

SAP classifies objects by their suitability for ABAP Cloud development:

| Level | Name | Status | Usage |
|-------|------|--------|-------|
| **A** | Recommended | Stable, well-tested | **Preferred choice** |
| **B** | Allowed | Standard SAP delivery | Use when A unavailable |
| **C** | Conditional | Has restrictions | Check documentation carefully |
| **D** | Deprecated/Forbidden | Not for ABAP Cloud | **Do NOT use** |

## Level Details

### Level A - Recommended

These objects are:
- Stable and well-tested
- Fully supported for ABAP Cloud
- Recommended for new development
- Have long-term support guarantees

**Examples:**
- I_PRODUCT (CDS interface)
- I_BUSINESSPARTNER (CDS interface)
- CL_SALV_TABLE (ALV SALV)
- Most released CDS view entities

### Level B - Allowed

These objects are:
- Part of standard SAP delivery
- Supported but not specifically recommended
- May have alternatives at Level A

**Usage:** Use when Level A alternatives are not available.

### Level C - Conditional

These objects are:
- Allowed but with specific restrictions
- May have usage limitations
- Require careful review of documentation

**Usage:** Read documentation thoroughly before use.

### Level D - Deprecated/Forbidden

These objects are:
- NOT released for ABAP Cloud
- Direct use is forbidden
- Must be replaced with alternatives

**Action:** Find successor/replacement object immediately.

## Checking Object Status

### Using the Clean Core Checker

```bash
# Check single object
python clean_core_checker.py MARA

# Check multiple objects
python clean_core_checker.py MARA BSEG CL_GUI_ALV_GRID

# Check compliant object
python clean_core_checker.py I_PRODUCT
```

### Using SAP APIs

The SAP Released Objects API provides:
- Object release status
- Clean Core level
- Successor/replacement objects
- Usage restrictions

## Common Forbidden Objects (Level D)

### DDIC Tables

| Table | Description | Replacement |
|-------|-------------|-------------|
| MARA | Material master | I_PRODUCT interface |
| MARC | Material client | I_PRODUCT interface |
| MAKT | Material descriptions | I_PRODUCT interface |
| BSEG | Document segment | I_OPERATIONALACCTGDOCITEM |
| VBAK | Sales header | Sales BAPIs/APIs |
| VBAP | Sales items | Sales BAPIs/APIs |
| T001 | Company codes | BAPIs/APIs |
| T002 | Language keys | BAPIs/APIs |
| KNA1 | Customer master | I_BUSINESSPARTNER interface |

### GUI Classes

| Class | Description | Replacement |
|-------|-------------|-------------|
| CL_GUI_ALV_GRID | ALV Grid control | CL_SALV_TABLE |
| CL_GUI_ALV_TREE | ALV Tree control | CL_SALV_TREE |
| CL_GUI_FRONTEND_SERVICES | GUI services | Not available in cloud |
| CL_GUI_RESOURCES | GUI resources | Not available in cloud |
| CL_GUI_CFW | GUI framework | Not available in cloud |

### Function Modules

Many classic function modules are not released. Use:
- Released BAPIs
- RAP business objects
- CDS view interfaces

## Finding Replacements

### Successor Objects

When an object is Level D, find its successor:

1. **Check Clean Core output** - Shows recommended successors
2. **Use SAP documentation** - Official migration guides
3. **Check released interfaces** - CDS views with `I_` prefix

### Common Successor Patterns

| Pattern | Example |
|---------|---------|
| Table → CDS Interface | MARA → I_PRODUCT |
| GUI → SALV | CL_GUI_ALV_GRID → CL_SALV_TABLE |
| Direct → API | Table read → BAPI_GETLIST |

## Clean Core Development Rules

1. **ALWAYS check object status** before using
2. **NEVER use Level D objects** in new code
3. **PREFER Level A** over Level B
4. **USE released APIs** instead of direct table access
5. **FOLLOW SAP guides** for ABAP Cloud development

## Documentation Links

- [SAP Released Objects API](https://github.com/SAP-samples/abap-file-formats)
- [ABAP Cloud Clean Core Guide](https://help.sap.com/doc/abap-cloud)
- [Clean Core Check Tool](https://help.sap.com/doc/abap-tools)
