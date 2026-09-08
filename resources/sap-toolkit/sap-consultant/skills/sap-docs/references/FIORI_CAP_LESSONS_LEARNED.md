# Fiori & CAP Development - Lessons Learned

**Critical bugs, fixes, and best practices from live development on SAP S/4HANA Cloud Public Edition.**

> **What this is, and what it is not.** Every rule here is about *how the platform
> behaves* — which ADT attributes it demands, what it rejects, in what order things
> activate. That part is hard-won and reliable.
>
> The **object names** in this document are not. They come from one system built before
> the NTT naming standard reached it, and they conflict with it throughout. Names for
> anything new come from `ts-generator/references/NAMING_STANDARD.md`, never from here.
> See "Names used in this walkthrough" below for the row-by-row difference.

## Critical Rules

### 1. Always Include `abapLanguageVersion`

**Error:** `403 S_ABPLNGVS not authorized`

When creating CDS views on BTP Public Edition, you MUST include:

```xml
adtcore:abapLanguageVersion="cloudDevelopment"
```

**Valid values:**
| Value | Use Case |
|-------|----------|
| `cloudDevelopment` | Custom Z objects (use this!) |
| `keyUser` | Key user extensibility |
| `standard` | SAP objects only |

### 2. Never Assume Package `ZAI` Exists

**Error:** `409 Package ZAI does not exist`

Always search for packages first:

```python
GET /sap/bc/adt/repository/informationsystem/search
  ?operation=quickSearch&query=Z*&objectType=DEVC&maxResults=30
```

Common customer packages: `ZMM000`, `ZSD000`, `ZFI000`, `ZCO000`.

### 3. Transport Must Precede Lock

**Error:** `409 ResourceLockConflict`

Always resolve transport BEFORE locking:

```python
# WRONG - creates ghost transport
lock_handle = client.lock_object(object_url)

# CORRECT
lock_handle = client.lock_object(object_url, transport=transport)
```

### 4. Use `define view entity` Not `define view`

On BTP Cloud with `cloudDevelopment`:

```abap
define view entity ZMM000_C_MATERIAL
  as select from mara
```

NOT the deprecated syntax with `@AbapCatalog.sqlViewName`.

## Full RAP Stack

```
MARA + MAKT (standard tables)
    ↓
ZMM000_C_MATERIAL         (root CDS — DDLS; the doc called it an interface view)
    ↓
ZMM000_C_MATERIAL_P       (CDS Projection View — DDLS)
    ↓
ZMM000_BDEF_MATERIAL      (Behavior Definition — read-only)
    ↓
ZMM000_SRVD_MATERIAL      (Service Definition — SRVD)
    ↓
ZMM000_SRVB_MATERIAL      (Service Binding — SRVB, OData V4 UI)
```

## Names used in this walkthrough — NOT a naming convention

> ⚠ **These names do not follow the NTT naming standard, and nothing here should be
> copied into a TS or a new development.** They are the names that exist on the system
> this walkthrough was recorded against, kept so the XML and JSON payloads below stay
> readable against real objects. The binding rules live in
> `ts-generator/references/NAMING_STANDARD.md` — §4.1 and §4.2 — and they win.
>
> The table used to be headed "Naming Convention", which read as a rule. Every row of
> it conflicts with the standard, so it was the kind of reference an agent could follow
> straight into a non-conforming stack:

| Object | Used here | What the standard says |
|---|---|---|
| RAP root CDS | `ZMM000_C_MATERIAL`, labelled *interface view* | `Z{M}{N}_R_{D}` — `_C_` is the **projection**, and an interface view (`_I_`) is a different layer altogether |
| Projection view | `ZMM000_C_MATERIAL_P` | `Z{M}{N}_C_{D}` — no `_P` suffix |
| Behavior Definition | `ZMM000_BDEF_MATERIAL` | the **same name as the root view** it belongs to |
| Service Definition | `ZMM000_SRVD_MATERIAL` | `Z{M}{N}_UI_{D}` (or `_API_`) |
| Service Binding | `ZMM000_SRVB_MATERIAL` | `Z{M}{N}_UI_{D}_O2` — the `_O2`/`_O4` suffix carries the OData version |
| Package | `ZMM000` | `Z<Modül>000` is the module **general** package (BAdI, enhancement, custom field); a RAP stack belongs to an item package, `ZMM001`+ |
| Max length | 40 | the MaxLen column of the standard's tables governs |

> Useful as a counter-example: this is a real stack, built before the standard reached
> it, and it is what the drift the standard exists to prevent actually looks like.

## CDS View Creation XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ddl:ddlSource xmlns:ddl="http://www.sap.com/adt/ddic/ddlsources"
               xmlns:adtcore="http://www.sap.com/adt/core"
               adtcore:name="ZMM000_C_MATERIAL"
               adtcore:description="Material Interface View"
               adtcore:masterLanguage="EN"
               adtcore:abapLanguageVersion="cloudDevelopment">
  <adtcore:packageRef adtcore:uri="/sap/bc/adt/packages/zmm000"
                      adtcore:type="DEVC/K"
                      adtcore:name="ZMM000"/>
  <ddl:sourceMainArtifact>
    <ddl:artifactType>ddlSource</ddl:artifactType>
    <ddl:source>-- CDS source code here</ddl:source>
  </ddl:sourceMainArtifact>
</ddl:ddlSource>
```

## Behavior Definition (BDEF)

| Parameter | Wrong | Correct |
|-----------|-------|---------|
| Endpoint | `/sap/bc/adt/behaviordefinitions` | `/sap/bc/adt/bo/behaviordefinitions` |
| Content-Type | `application/vnd.sap.adt.behaviorDefinition+xml` | `application/vnd.sap.adt.blues.v1+xml` |
| XML namespace | `http://www.sap.com/adt/behaviorDefinitions` | `http://www.sap.com/wbobj/blue` |

### Read-Only BDEF

```abap
managed implementation in class zbp_mm000_material unique;
strict ( 2 );

define behavior for ZMM000_C_MATERIAL_P alias Material
{
  use etag master MaterialDescription;
}
```

## Service Binding (SRVB) Uses AFF JSON

**Critical:** SRVB uses **AFF JSON format**, NOT XML.

```json
{
  "formatVersion": "1",
  "header": {
    "description": "Material Service Binding",
    "originalLanguage": "EN",
    "abapLanguageVersion": "cloudDevelopment"
  },
  "bindingType": "ODATA",
  "bindingTypeCategory": "0",
  "services": [{
    "name": "ZMM000_SRVB_MATERIAL",
    "versions": [{
      "serviceVersion": "0001",
      "serviceBuildVersion": 0,
      "serviceDefinition": "ZMM000_SRVD_MATERIAL"
    }]
  }]
}
```

**bindingTypeCategory:** `"0"` = UI binding, `"1"` = Web API binding

## Common Errors

| HTTP | Error | Fix |
|------|-------|-----|
| 403 | `S_ABPLNGVS not authorized` | Add `abapLanguageVersion="cloudDevelopment"` |
| 409 | `Package XYZ does not exist` | Search packages first |
| 409 | `ResourceLockConflict` | Pass `transport=` to lock |
| 412 | `ETag mismatch` | Use inactive ETag |
| 500 | `No implementation selected for BAdI` | Use `application/json` for SRVB |

## CDS with Fiori Annotations

```abap
@Metadata.layer: #CUSTOMER
@UI.headerInfo: {
  typeName: 'Material',
  typeNamePlural: 'Materials',
  title: { type: #STANDARD, value: 'Material' },
  description: { type: #STANDARD, value: 'MaterialDescription' }
}
define view entity ZMM000_C_MATERIAL_P
  provider contract transactional_query
  as projection on ZMM000_C_MATERIAL
{
  @UI.lineItem: [{ position: 10 }]
  @UI.selectionField: [{ position: 10 }]
  key Material,

  @UI.lineItem: [{ position: 20 }]
  MaterialDescription,

  @UI.lineItem: [{ position: 30 }]
  MaterialType
}
```

## Joining MARA + MAKT

```abap
define view entity ZMM000_C_MATERIAL
  as select from mara
  left outer join makt on  makt.matnr = mara.matnr
                        and makt.spras = $session.system_language
{
  key mara.matnr    as Material,
      mara.mtart    as MaterialType,
      mara.meins    as BaseUnit,
      mara.matkl    as MaterialGroup,
      mara.ersda    as CreationDate,
      makt.maktx    as MaterialDescription
}
```

## Activation Order

1. Interface view (`ZMM000_C_MATERIAL`)
2. Projection view (`ZMM000_C_MATERIAL_P`)
3. Service Definition (`ZMM000_SRVD_MATERIAL`)
4. Service Binding (`ZMM000_SRVB_MATERIAL`)
