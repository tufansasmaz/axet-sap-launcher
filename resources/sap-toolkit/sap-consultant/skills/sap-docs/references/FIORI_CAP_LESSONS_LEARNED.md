# Fiori & CAP Development - Lessons Learned

**Critical bugs, fixes, and best practices from live development on SAP S/4HANA Cloud Public Edition.**

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
ZMM000_C_MATERIAL         (CDS Interface View — DDLS)
    ↓
ZMM000_C_MATERIAL_P       (CDS Projection View — DDLS)
    ↓
ZMM000_BDEF_MATERIAL      (Behavior Definition — read-only)
    ↓
ZMM000_SRVD_MATERIAL      (Service Definition — SRVD)
    ↓
ZMM000_SRVB_MATERIAL      (Service Binding — SRVB, OData V4 UI)
```

## Naming Convention

| Object | Prefix | Max Length | Example |
|--------|--------|------------|---------|
| CDS Interface View | `_C_` | 40 chars | `ZMM000_C_MATERIAL` |
| CDS Projection View | `_C_` + `_P` | 40 chars | `ZMM000_C_MATERIAL_P` |
| Behavior Definition | `_BDEF_` | 40 chars | `ZMM000_BDEF_MATERIAL` |
| Service Definition | `_SRVD_` | 40 chars | `ZMM000_SRVD_MATERIAL` |
| Service Binding | `_SRVB_` | 40 chars | `ZMM000_SRVB_MATERIAL` |

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
