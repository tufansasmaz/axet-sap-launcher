# DDIC Object Management via SAP ADT API

## Discovery

By analyzing SAP's ADT Discovery endpoint and testing with actual API calls, we confirmed that **DDIC objects CAN be managed via ADT REST API**.

## Supported DDIC Objects

### ✅ Data Elements (DTEL/DE)
- **Endpoint**: `/sap/bc/adt/ddic/dataelements`
- **Accept Header**: `application/vnd.sap.adt.dataelements.v2+xml`
- **Methods**: GET, POST, PUT, DELETE
- **Validation**: `/sap/bc/adt/ddic/dataelements/validation`

### ✅ Domains (DOMA/DD)
- **Endpoint**: `/sap/bc/adt/ddic/domains`
- **Accept Header**: `application/vnd.sap.adt.domains.v2+xml`
- **Methods**: GET, POST, PUT, DELETE
- **Validation**: `/sap/bc/adt/ddic/domains/validation`

### ✅ Tables (TABL/DT)
- **Endpoint**: `/sap/bc/adt/ddic/tables`
- **Accept Header**: `application/vnd.sap.adt.tables.v2+xml`
- **Methods**: GET, POST, PUT, DELETE
- **Validation**: `/sap/bc/adt/ddic/tables/validation`

### ✅ Structures (TABL/DS)
- **Endpoint**: `/sap/bc/adt/ddic/structures`
- **Accept Header**: `application/vnd.sap.adt.structures.v2+xml`
- **Methods**: GET, POST, PUT, DELETE
- **Validation**: `/sap/bc/adt/ddic/structures/validation`

## Data Element Structure Example

```xml
<?xml version="1.0" encoding="utf-8"?>
<blue:wbobj
  adtcore:name="ZAI_E_MODEL"
  adtcore:type="DTEL/DE"
  adtcore:description="LLM Model"
  adtcore:language="TR"
  xmlns:blue="http://www.sap.com/wbobj/dictionary/dtel"
  xmlns:adtcore="http://www.sap.com/adt/core">

  <adtcore:packageRef
    adtcore:uri="/sap/bc/adt/packages/zai"
    adtcore:type="DEVC/K"
    adtcore:name="ZAI"/>

  <dtel:dataElement xmlns:dtel="http://www.sap.com/adt/dictionary/dataelements">
    <dtel:typeKind>domain</dtel:typeKind>
    <dtel:typeName>CHAR200</dtel:typeName>
    <dtel:dataType>CHAR</dtel:dataType>
    <dtel:dataTypeLength>000200</dtel:dataTypeLength>
    <dtel:dataTypeDecimals>000000</dtel:dataTypeDecimals>

    <dtel:shortFieldLabel>LLM Model</dtel:shortFieldLabel>
    <dtel:shortFieldLength>10</dtel:shortFieldLength>

    <dtel:mediumFieldLabel>LLM Model</dtel:mediumFieldLabel>
    <dtel:mediumFieldLength>20</dtel:mediumFieldLength>

    <dtel:longFieldLabel>LLM Model</dtel:longFieldLabel>
    <dtel:longFieldLength>40</dtel:longFieldLength>

    <dtel:headingFieldLabel>LLM Model</dtel:headingFieldLabel>
    <dtel:headingFieldLength>55</dtel:headingFieldLength>

    <dtel:searchHelp/>
    <dtel:searchHelpParameter/>
    <dtel:setGetParameter/>
    <dtel:defaultComponentName/>

    <dtel:deactivateInputHistory>false</dtel:deactivateInputHistory>
    <dtel:changeDocument>false</dtel:changeDocument>
    <dtel:leftToRightDirection>false</dtel:leftToRightDirection>
    <dtel:deactivateBIDIFiltering>false</dtel:deactivateBIDIFiltering>
  </dtel:dataElement>
</blue:wbobj>
```

## Creating DDIC Objects

### Required Headers
- **Accept**: `application/vnd.sap.adt.{objecttype}.v2+xml`
- **Content-Type**: `application/vnd.sap.adt.{objecttype}.v2+xml`
- **X-CSRF-Token**: Required (from `fetch_csrf_token()`)
- **X-sap-adt-transport**: Transport request number

### Workflow

1. **Validate Name**
   ```
   POST /sap/bc/adt/ddic/dataelements/validation
   Body: name to validate
   ```

2. **Create Object**
   ```
   POST /sap/bc/adt/ddic/dataelements
   Headers: Accept, Content-Type, X-CSRF-Token, X-sap-adt-transport
   Body: XML structure (as shown above)
   ```

3. **Activate Object**
   ```
   POST /sap/bc/adt/activation
   Body: Object URI + activation parameters
   ```

## Implementation Notes

- DDIC objects require **transport requests** for creation/modification
- XML namespace must match SAP's schema exactly
- Field labels have **length restrictions** (short: 10, medium: 20, long: 40, heading: 55)
- Type kinds: `domain`, `predefined`, `reference` (for data elements)
- All operations require proper **CSRF token** and **session cookies**

## Next Steps for Implementation

1. Add `create_dataelement()` method to `sap_adt_lib.py`
2. Add `create_domain()` method to `sap_adt_lib.py`
3. Add `get_dataelement()` and `get_domain()` methods
4. Update `object_types.py` to include DDIC object types
5. Create helper functions for XML generation

## Learned From

- Discovery endpoint: `/sap/bc/adt/discovery` (Accept: `application/atomsvc+xml`)
- Actual API testing with ZAI_E_MODEL data element
- SAP ADT Documentation implied in discovery response
