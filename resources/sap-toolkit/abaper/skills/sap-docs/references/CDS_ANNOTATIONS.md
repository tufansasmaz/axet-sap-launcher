# CDS Annotations Reference

Common CDS (Core Data Services) annotations for ABAP Cloud development.

## CDS View Annotations

### End User Text

| Annotation | Purpose |
|------------|---------|
| `@EndUserText.label` | Define short label for field |
| `@EndUserText.text` | Define description text |

### Object Model Annotations

| Annotation | Purpose |
|------------|---------|
| `@ObjectModel.textElement` | Mark field as text element for OData |
| `@ObjectModel.readOnly` | Mark field as read-only in OData |
| `@ObjectModel.compositionRoot` | Mark as composition root in BDEF |
| `@ObjectModel.association` | Define association in BDEF |
| `@ObjectModel.supportedCapabilities` | Define supported operations |
| `@ObjectModel.entityType` | Define entity type in BDEF |

### Data Model Annotations

| Annotation | Purpose |
|------------|---------|
| `@DataModel.readOnly` | Mark field as read-only (UI.hidden in RAP) |

### UI Annotations

| Annotation | Purpose |
|------------|---------|
| `@UI.hidden` | Hide field from UI |
| `@UI.identification` | Mark field as identification (key visual) |
| `@UI.lineItem` | Show field in list/table |
| `@UI.selectionField` | Show field as selection criteria |

## RAP Annotations

### OData Publishing

| Annotation | Purpose |
|------------|---------|
| `@OData.publish` | Publish CDS view as OData service |
| `@OData.format` | Format options (JSON, XML) |
| `@OData.service` | Define OData service name |

### Behavior Definition Annotations

| Annotation | Purpose |
|------------|---------|
| `@Semantics.userDefault` | Default value for property |
| `@Semantics.user.filled` | User must fill value |
| `@Semantics.user.readOnly` | User read-only property |
| `@Semantics.alternativeKey` | Alternative key for uniqueness |

## DDIC/Table Annotations

| Annotation | Purpose |
|------------|---------|
| `@SEMANTICS.quantity` | Field is a quantity |
| `@SEMANTICS.amount` | Field is an amount |
| `@SEMANTICS.price` | Field is a price |
| `@SEMANTICS.unit` | Field is a unit of measure |

## Access Control

| Annotation | Purpose |
|------------|---------|
| `@AccessControl.authorizationCheck` | Define access control |
| `@Metadata.allowExtensions` | Allow metadata extensions |

## Consumption

| Annotation | Purpose |
|------------|---------|
| `@Consumption` | Define consumption (view, service, etc.) |
| `@Consumption.derivation` | Define derivation logic |

## Documentation Links

- [SAP Help Portal - CDS Annotations](https://help.sap.com/doc/abap-docs/latest/en-US/index.htm?file=abencds_annotations_glosry.htm)
- [RAP Annotations Guide](https://help.sap.com/doc/abap-rap/en-US)
