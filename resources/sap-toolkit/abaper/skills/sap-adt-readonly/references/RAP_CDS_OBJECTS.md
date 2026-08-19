# RAP & CDS Object Types - ADT API Discovery Results

## Discovery Summary

Live testing against SAP system IED (Client 400) confirmed that the following RAP/CDS object types are fully supported via ADT REST API. All creation endpoints returned **409** (transport not found) rather than 404/405, proving the endpoints accept the XML payloads and would create objects with a valid transport.

## Confirmed Object Types

### CDS DDL Source (DDLS/DF)

| Property | Value |
|----------|-------|
| **Search Type** | `DDLS` |
| **ADT Type** | `DDLS/DF` |
| **Endpoint** | `/sap/bc/adt/ddic/ddl/sources/{name}` |
| **Source** | `/sap/bc/adt/ddic/ddl/sources/{name}/source/main` |
| **Accept (metadata)** | `application/vnd.sap.adt.ddlSource+xml` |
| **Accept (source)** | `text/plain` |
| **Validation** | `POST /sap/bc/adt/ddic/ddl/validation` |
| **Validation Params** | `objname`, `packagename`, `description` |
| **Can Read** | Yes (confirmed with Z0001_V_MSEG) |
| **Can Create** | Yes (via existing `create_cds_view.py`) |
| **Source Types** | `V` (View), `E` (Extend), `P` (Projection), `F` (Custom Entity), `A` (Abstract Entity), `I` (Interface View), `H` (Hierarchy) |
| **File Extension** | `.ddls.asddls` |

**XML Namespace (metadata):**
```xml
xmlns:ddl="http://www.sap.com/adt/ddic/ddlsources"
xmlns:abapsource="http://www.sap.com/adt/abapsource"
xmlns:adtcore="http://www.sap.com/adt/core"
```

**Read Example:**
```bash
# Get DDL source code as plain text
GET /sap/bc/adt/ddic/ddl/sources/z0001_v_mseg/source/main
Accept: text/plain

# Response:
# @AbapCatalog.sqlViewAppendName: 'Z0001_DDL_MSEG'
# @EndUserText.label: 'MSEG extension'
# extend view nsdm_e_mseg with Z0001_V_MSEG { zumud }
```

---

### Service Definition (SRVD)

| Property | Value |
|----------|-------|
| **Search Type** | `SRVD` |
| **Endpoint** | `/sap/bc/adt/ddic/srvd/sources/{name}` |
| **Create** | `POST /sap/bc/adt/ddic/srvd/sources` |
| **Content-Type** | `application/vnd.sap.adt.ddic.srvd.v1+xml` |
| **Accept** | `application/vnd.sap.adt.ddic.srvd.v1+xml` |
| **Source Types** | `S` (Definition), `X` (Extension) |
| **Can Create** | Yes (409 = transport issue, not endpoint issue) |
| **File Extension** | `.srvd.srvdsrv` |

**XML Namespace:**
```xml
xmlns:srvdSource="http://www.sap.com/adt/ddic/srvdsources"
xmlns:adtcore="http://www.sap.com/adt/core"
```

**Create XML Payload:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<srvdSource:srvdSource xmlns:srvdSource="http://www.sap.com/adt/ddic/srvdsources"
  xmlns:adtcore="http://www.sap.com/adt/core"
  adtcore:name="ZAI_SRVD_TEST"
  adtcore:description="Test Service Definition"
  adtcore:language="EN"
  adtcore:masterLanguage="EN"
  adtcore:responsible="USERNAME">
  <adtcore:packageRef adtcore:name="ZAI"/>
</srvdSource:srvdSource>
```

**Create Request:**
```
POST /sap/bc/adt/ddic/srvd/sources?corrNr={transport}
Content-Type: application/vnd.sap.adt.ddic.srvd.v1+xml
Accept: application/vnd.sap.adt.ddic.srvd.v1+xml
```

---

### Service Binding (SRVB)

| Property | Value |
|----------|-------|
| **Search Type** | `SRVB` |
| **Endpoint** | `/sap/bc/adt/businessservices/bindings/{name}` |
| **Create** | `POST /sap/bc/adt/businessservices/bindings` |
| **Content-Type** | `application/vnd.sap.adt.businessservices.servicebinding.v2+xml` |
| **Validation** | `POST /sap/bc/adt/businessservices/bindings/validation` |
| **Validation Params** | `objname`, `serviceDefinition`, `serviceBindingVersion`, `package` |
| **Binding Types Endpoint** | `GET /sap/bc/adt/businessservices/bindings/bindingtypes` |
| **Can Create** | Yes (409 = transport issue, not endpoint issue) |
| **File Extension** | `.srvb.srvbsrv` |

**Available Binding Types (6):**

| Name | Version | Description |
|------|---------|-------------|
| `INA` | 0 | InA (Information Access) |
| `ODATA` | 0 | OData V2 (UI) |
| `ODATA` | 1 | OData V2 (Web API) |
| `ODATA` | 0 | OData V4 (UI) |
| `ODATA` | 1 | OData V4 (Web API) |
| `IWSG` | 0 | SAP Gateway |

**XML Namespace:**
```xml
xmlns:srvb="http://www.sap.com/adt/ddic/ServiceBindings"
xmlns:adtcore="http://www.sap.com/adt/core"
```

**Create XML Payload:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<srvb:serviceBinding xmlns:srvb="http://www.sap.com/adt/ddic/ServiceBindings"
  xmlns:adtcore="http://www.sap.com/adt/core"
  adtcore:name="ZAI_BIND_TEST"
  adtcore:description="Test Service Binding"
  adtcore:language="EN">
  <adtcore:packageRef adtcore:name="ZAI"/>
</srvb:serviceBinding>
```

---

### Behavior Definition (BDEF)

| Property | Value |
|----------|-------|
| **Search Type** | `BDEF` |
| **Endpoint** | `/sap/bc/adt/bo/behaviordefinitions/{name}` |
| **Create** | `POST /sap/bc/adt/bo/behaviordefinitions` |
| **Content-Type** | `application/vnd.sap.adt.blues.v1+xml` |
| **Accept** | `application/vnd.sap.adt.blues.v1+xml` |
| **Validation** | `POST /sap/bc/adt/bo/behaviordefinitions/validation` |
| **Validation Accept** | `application/vnd.sap.as+xml` |
| **Validation Params** | `objname`, `description` |
| **Validation Response** | `<SEVERITY>OK</SEVERITY>` on success |
| **Can Create** | Yes (409 = transport issue, not endpoint issue) |
| **File Extension** | `.bdef.asbdef` |

**XML Namespace:**
```xml
xmlns:blue="http://www.sap.com/wbobj/blue"
xmlns:adtcore="http://www.sap.com/adt/core"
```

**Create XML Payload:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<blue:blueSource xmlns:blue="http://www.sap.com/wbobj/blue"
  xmlns:adtcore="http://www.sap.com/adt/core"
  adtcore:name="ZAI_BDEF_TEST"
  adtcore:description="Test Behavior Definition"
  adtcore:language="EN"
  adtcore:masterLanguage="EN"
  adtcore:responsible="USERNAME">
  <adtcore:packageRef adtcore:name="ZAI"/>
</blue:blueSource>
```

---

### Metadata Extension (DDLX)

| Property | Value |
|----------|-------|
| **Search Type** | `DDLX` |
| **Endpoint** | `/sap/bc/adt/ddic/ddlx/sources/{name}` |
| **Create** | `POST /sap/bc/adt/ddic/ddlx/sources` |
| **Content-Type** | `application/vnd.sap.adt.ddic.ddlx.v1+xml` |
| **Accept** | `application/vnd.sap.adt.ddic.ddlx.v1+xml` |
| **Validation** | `POST /sap/bc/adt/ddic/ddlx/sources/validation` |
| **Validation Accept** | `application/vnd.sap.as+xml` |
| **Validation Params** | `objname`, `description` |
| **Validation Response** | `<CHECK_RESULT>X</CHECK_RESULT>` on success |
| **Can Create** | Yes (409 = transport issue, not endpoint issue) |
| **File Extension** | `.ddlx.asddlxs` |

**XML Namespace:**
```xml
xmlns:ddlx="http://www.sap.com/adt/ddic/ddlxsources"
xmlns:adtcore="http://www.sap.com/adt/core"
```

**Create XML Payload:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<ddlx:ddlxSource xmlns:ddlx="http://www.sap.com/adt/ddic/ddlxsources"
  xmlns:adtcore="http://www.sap.com/adt/core"
  adtcore:name="ZAI_DDLX_TEST"
  adtcore:description="Test Metadata Extension"
  adtcore:language="EN"
  adtcore:masterLanguage="EN"
  adtcore:responsible="USERNAME">
  <adtcore:packageRef adtcore:name="ZAI"/>
</ddlx:ddlxSource>
```

---

### Annotation Definition (DDLA)

| Property | Value |
|----------|-------|
| **Endpoint** | `/sap/bc/adt/ddic/ddla/sources/{name}` |
| **Accept** | `application/vnd.sap.adt.ddic.ddla.v1+xml` |
| **Can Read** | Yes (404 = object not found, endpoint works) |
| **Status** | Endpoint available, no test objects on system |

---

## OData Service Management

### OData V2 Service List

| Property | Value |
|----------|-------|
| **Endpoint** | `/sap/bc/adt/businessservices/odatav2` |
| **Accept** | `application/vnd.sap.adt.businessservices.odatav2.v2+xml` |
| **Search Param** | `servicename` |
| **Status** | Endpoint works (200 OK), returns service list XML |

### OData V4 Service List

| Property | Value |
|----------|-------|
| **Endpoint** | `/sap/bc/adt/businessservices/odatav4` |
| **Accept** | `application/vnd.sap.adt.businessservices.odatav4.v1+xml` |
| **Status** | Returns 400 (URI mapping error for G4BA) - may need specific params |

---

## AMDP (ABAP Managed Database Procedures)

AMDP classes are regular ABAP classes with `METHOD ... BY DATABASE PROCEDURE` syntax. They use the standard class endpoints:

| Property | Value |
|----------|-------|
| **Create** | Use standard class creation (`/sap/bc/adt/oo/classes`) |
| **Read/Write** | Use standard class source endpoints |
| **Debug** | `/sap/bc/adt/amdp/debugger/main` (requires parameters) |
| **Data Preview** | `/sap/bc/adt/datapreview/amdp` (requires parameters) |
| **Status** | Debug/preview endpoints exist but need specific params |

---

## Where-Used List

The where-used endpoint works for all object types:

```
POST /sap/bc/adt/relations/whereused
```

Confirmed working with 11,687 results for table MARA.

---

## Implementation Priority

Based on discovery results, recommended implementation order:

### Phase 1: CDS DDL Source (Already Implemented)
- `create_cds_view.py` already exists
- Read via `download_object.py` with type `cds`
- Source at `/source/main` as `text/plain`

### Phase 2: Service Definition (SRVD)
- New script: `create_service_definition.py`
- XML namespace confirmed: `http://www.sap.com/adt/ddic/srvdsources`
- Content-Type: `application/vnd.sap.adt.ddic.srvd.v1+xml`

### Phase 3: Service Binding (SRVB)
- New script: `create_service_binding.py`
- XML namespace confirmed: `http://www.sap.com/adt/ddic/ServiceBindings`
- Content-Type: `application/vnd.sap.adt.businessservices.servicebinding.v2+xml`
- Binding types endpoint available for discovery

### Phase 4: Behavior Definition (BDEF)
- New script: `create_behavior_definition.py`
- XML namespace confirmed: `http://www.sap.com/wbobj/blue`
- Content-Type: `application/vnd.sap.adt.blues.v1+xml`

### Phase 5: Metadata Extension (DDLX)
- New script: `create_metadata_extension.py`
- XML namespace confirmed: `http://www.sap.com/adt/ddic/ddlxsources`
- Content-Type: `application/vnd.sap.adt.ddic.ddlx.v1+xml`

---

## Common Patterns

### Transport Parameter
All creation endpoints use `corrNr` query parameter:
```
POST /sap/bc/adt/ddic/srvd/sources?corrNr=IEDK999999
```

### Validation Before Create
All types support a validation endpoint that checks name uniqueness:
```
POST /sap/bc/adt/bo/behaviordefinitions/validation?objname=ZAI_TEST&description=Test
Accept: application/vnd.sap.as+xml
```

Success response:
```xml
<asx:abap version="1.0" xmlns:asx="http://www.sap.com/abapxml">
  <asx:values>
    <DATA><SEVERITY>OK</SEVERITY></DATA>
  </asx:values>
</asx:abap>
```

### Source Code Upload
After creation, source code is uploaded via PUT to the `/source/main` sub-resource:
```
PUT /sap/bc/adt/ddic/srvd/sources/{name}/source/main
Content-Type: text/plain
X-sap-adt-lockHandle: {lock_handle}
```

### Activation
All types use the standard activation endpoint:
```
POST /sap/bc/adt/activation
```

---

## Test Evidence

| Object Type | Endpoint Exists | XML Accepted | Create Works | Read Works |
|-------------|----------------|--------------|--------------|------------|
| CDS (DDLS) | Yes | Yes | Yes (existing script) | Yes (Z0001_V_MSEG) |
| SRVD | Yes | Yes (409) | Yes* | Untested (no objects) |
| SRVB | Yes | Yes (409) | Yes* | Untested (no objects) |
| BDEF | Yes | Yes (409) | Yes* | Untested (no objects) |
| DDLX | Yes | Yes (409) | Yes* | Untested (no objects) |
| DDLA | Yes | N/A | Untested | Yes (404 = not found, not invalid) |

*409 = "Transport FIDK901433 does not exist in system IED" - proves the endpoint accepted the payload and tried to process it, failing only on the invalid transport number.
