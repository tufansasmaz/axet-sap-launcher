# ABAP Cloud Development Guides

Essential guides for ABAP Cloud development on SAP BTP and S/4HANA Cloud.

## RAP (RESTful Application Programming Model)

### Key Concepts

RAP is SAP's modern programming model for building OData services in ABAP Cloud.

**Core Components:**
1. **CDS View Entities** - Data models
2. **Behavior Definitions (BDEF)** - Business logic interface
3. **Behavior Implementations (BIMP)** - Business logic implementation
4. **Service Bindings** - OData service exposure

### RAP Development Flow

```
1. CDS View Entity (Data Model)
   ↓
2. Behavior Definition (Interface)
   ↓
3. Behavior Implementation (Logic)
   ↓
4. Service Definition
   ↓
5. Service Binding
```

### Behavior Definition Types

| Type | Description | Use Case |
|------|-------------|----------|
| **Managed** | Standard CRUD + save sequence | Most business objects |
| **Unmanaged** | Custom save method | Complex scenarios |
| **Abstract** | Base for other BDEFs | Reusable definitions |
| **Projection** | Interface to other BOs | Layered architecture |

### RAP BO Types

| Type | Description |
|------|-------------|
| **Root** | Top-level entity with independent lifecycle |
| **Child** | Dependent on parent (composition) |
| **Part** | Add-on feature (association) |

## CDS (Core Data Services)

### View Entities

```abap
@EndUserText.label: 'My View'
@AccessControl.authorizationCheck: #CHECK
@OData.publish: true
define view entity Z_I_MY_VIEW
  as select from ztable as z
{
  key z.id           as ID,
      z.name         as Name,
      z.description  as Description
}
```

### Metadata Extensions

```abap
@Metadata.layer: #CORE
annotate view Z_I_MY_VIEW with
{
  @UI.identification: [ { position: 10 } ]
  @UI.lineItem: [ { position: 10 } ]
  ID;

  @UI.identification: [ { position: 20 } ]
  Name;
}
```

### Access Control

```abap
@EndUserText.label: 'Access Control'
@AccessControl.authorizationCheck: #REQUIRED
define view entity Z_I_SECURE_VIEW
  as select from ztable as z
{
  // P WHERE condition for implicit access control
}
```

## Clean Core Development

### Clean Core Principles

1. **Use only released objects** - Check release status before using
2. **Avoid forbidden tables** - MARA, BSEG, VBAK, T001, etc.
3. **Use standard APIs** - BAPIs, released CDS views, RAP BOs
4. **No dynamic programming** - Avoid dynamic SQL, field symbols where possible
5. **Follow naming conventions** - Z/Y namespace, proper prefixes

### Clean Core Levels

| Level | Description | Usage |
|-------|-------------|-------|
| **A** | Recommended (stable) | Preferred choice |
| **B** | Allowed (standard) | Use when A unavailable |
| **C** | Conditional (restrictions) | Check documentation |
| **D** | Deprecated (forbidden) | Do NOT use |

### Common Replacements

| Forbidden Object | Replacement |
|------------------|-------------|
| MARA (Material master) | I_PRODUCT CDS interface |
| BSEG (Document segment) | I_OPERATIONALACCTGDOCITEM CDS |
| CL_GUI_ALV_GRID | CL_SALV_TABLE |
| VBAK (Sales header) | Sales BAPIs/APIs |
| T001 (Company code) | BAPIs/APIs |

## ABAP Cloud vs Standard ABAP

### Key Differences

| Feature | Standard ABAP | ABAP Cloud |
|---------|---------------|------------|
| GUI components | Available | NOT available |
| Table access | Direct SELECT/INSERT | Via CDS views only |
| DDIC access | Direct table access | Released tables only |
| Transactions | Classic GUI transactions | RAP-based UIs (Fiori) |
| Programs | Executable reports | Limited use |

### ABAP Cloud Programming Model

1. **CDS-based data modeling** - No direct table access
2. **RAP for business logic** - No classic transactions
3. **Released APIs only** - Check object compatibility
4. **Fiori UI** - No SAP GUI

## Development Tools

### Recommended Tools

| Tool | Purpose |
|------|---------|
| **ADT (ABAP Development Tools)** | Eclipse-based IDE |
| **Business Application Studio** | Cloud-based IDE |
| **SAP GUI** | Limited use in cloud |

### ADT Features

- Project explorer
- CDS view editor
- Behavior definition editor
- Debugger
- Test cockpit integration

## Documentation Links

### Official SAP Documentation

- [ABAP Cloud Programming Model](https://help.sap.com/doc/abap-cloud)
- [RAP Development Guide](https://help.sap.com/doc/abap-rap)
- [CDS Reference](https://help.sap.com/doc/abap-cds)
- [Clean Core Guide](https://help.sap.com/doc/abap-cloud/en-US/abap-cloud-clean-core.htm)

### Community Resources

- [SAP Community ABAP Cloud](https://community.sap.com/topics/abap-cloud)
- [Software Heroes Tutorials](https://developers.sap.com/tutorials)
- [SAP Help Portal](https://help.sap.com)

## Learning Path

1. **Start with CDS** - Learn data modeling
2. **Master RAP** - Behavior definitions and implementations
3. **Clean Core** - Understand released objects
4. **Fiori Elements** - UI development
5. **Testing** - Unit tests, ATC checks
