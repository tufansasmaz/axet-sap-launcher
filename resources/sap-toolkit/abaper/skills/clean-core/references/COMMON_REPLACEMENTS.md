# Common ABAP Cloud Replacements

Quick reference for replacing forbidden SAP objects with ABAP Cloud alternatives.

## Material Master (MARA, MARC, MAKT)

### Forbidden Objects
- `MARA` - Material master (client)
- `MARC` - Material master (plant)
- `MAKT` - Material descriptions
- `MARM` - Material units of measure
- `MVKE` - Material sales data

### Clean Core Alternatives

```abap
" Use I_PRODUCT CDS interface instead
SELECT *
  FROM I_Product
  FIELDS Product, ProductType, CreationDate
  INTO TABLE @DATA(lt_products).

" With parameters
SELECT *
  FROM I_Product( p_sLanguage = @sy-langu )
  FIELDS Product, ProductType
  INTO TABLE @DATA(lt_products_local).
```

### Business Object
- **RAP BO:** `I_ProductSrv` (Product Service)
- **OData Service:** `API_PRODUCT_SRV` or `OP_API_PRODUCT_SRV`

## Accounting Documents (BSEG, BKPF)

### Forbidden Objects
- `BSEG` - Document segment (line items)
- `BKPF` - Document header

### Clean Core Alternatives

```abap
" Use I_OperationalAcctgDocItem API
SELECT *
  FROM I_OperationalAcctgDocItem
  FIELDS CompanyCode, AccountingDocument, Ledger
  INTO TABLE @DATA(lt_doc_items).
```

### Business Object
- **RAP BO:** `I_OperationalAcctgDocItemSrv`
- **OData Service:** `API_JOURNAL_ENTRY_ITEM_SRV`

## Customer Master (KNA1, KNVV, KNVP)

### Forbidden Objects
- `KNA1` - Customer master (general)
- `KNVV` - Customer master (sales)
- `KNVP` - Customer partner functions

### Clean Core Alternatives

```abap
" Use I_BusinessPartner interface
SELECT *
  FROM I_BusinessPartner
  FIELDS BusinessPartner, BusinessPartnerType
  INTO TABLE @DATA(lt_partners).
```

### Business Object
- **RAP BO:** `I_BusinessPartnerSrv`
- **OData Service:** `API_BUSINESS_PARTNER_SRV`

## Sales Documents (VBAK, VBAP, VBKD)

### Forbidden Objects
- `VBAK` - Sales header
- `VBAP` - Sales items
- `VBKD` - Sales business data

### Clean Core Alternatives

```abap
" Use BAPIs or RAP services
" No direct CDS view replacement - use APIs

" Example: Sales Order BAPI
CALL FUNCTION 'BAPI_SALESORDER_GETLIST'
  EXPORTING
    customer_number = lv_customer
  TABLES
    sales_orders = lt_orders.
```

### Business Object
- **BAPI:** `BAPI_SALESORDER_*` function modules
- **OData Service:** `API_SALES_ORDER_SRV`

## ALV Controls

### Forbidden Objects
- `CL_GUI_ALV_GRID` - Classic ALV Grid
- `CL_GUI_ALV_TREE` - Classic ALV Tree
- `CL_GUI_CONTAINER` - GUI Container

### Clean Core Alternatives

```abap
" Use CL_SALV_TABLE for ALV display
TRY.
    cl_salv_table=>factory(
      IMPORTING
        r_salv_table = DATA(lo_alv)
      CHANGING
        t_table      = lt_data ).

    " Display
    lo_alv->display( ).
  CATCH cx_salv_msg INTO DATA(lx_msg).
    " Error handling
ENDTRY.
```

### SALV Classes

| Class | Purpose |
|-------|---------|
| `CL_SALV_TABLE` | ALV Table (basic) |
| `CL_SALV_TREE` | ALV Tree (hierarchical) |
| `CL_SALV_HIERSEQ_TABLE` | Hierarchical-sequential table |
| `CL_SALV_FUNCTIONS_LIST` - Add functions |
| `CL_SALV_LAYOUT` - Layout management |
| `CL_SALV_COLUMNS` - Column settings |
| `CL_SALV_SELECTIONS` - Selection modes |

## GUI Services (Not Available in Cloud)

### Forbidden Objects
- `CL_GUI_FRONTEND_SERVICES` - File operations
- `CL_GUI_RESOURCES` - GUI resources
- `CL_GUI_CFW` - Control framework
- `CL_GUI_HTML_VIEWER` - HTML viewer
- `CL_GUI_TEXTEDIT` - Text editor

### Cloud Alternatives

| Function | Cloud Alternative |
|----------|-------------------|
| File download | OData service / Fiori download |
| File upload | Fiori upload / Attachment service |
| Local files | Not supported - use cloud storage |
| GUI dialogs | Fiori UI / SAPUI5 |

## Program/Report Execution

### Forbidden
- `SUBMIT ... AND RETURN` - Report calls
- `CALL TRANSACTION` - Transaction calls
- `LEAVE TO TRANSACTION` - Transaction navigation

### Cloud Alternative
- RAP services
- OData services
- Fiori apps

## Direct Table Access

### Forbidden Pattern
```abap
" DON'T do this in ABAP Cloud
SELECT * FROM mara INTO TABLE @DATA(lt_mara).
```

### Correct Pattern
```abap
" DO this - use CDS view
SELECT * FROM I_Product INTO TABLE @DATA(lt_products).
```

## Quick Reference Table

| Forbidden Object | Type | Clean Core Replacement |
|------------------|------|------------------------|
| MARA | TABL | I_PRODUCT (CDS interface) |
| MARC | TABL | I_PRODUCT (CDS interface) |
| BSEG | TABL | I_OPERATIONALACCTGDOCITEM |
| KNA1 | TABL | I_BUSINESSPARTNER |
| VBAK | TABL | Sales BAPIs/APIs |
| T001 | TABL | I_CompanyCode |
| CL_GUI_ALV_GRID | CLAS | CL_SALV_TABLE |
| CL_GUI_ALV_TREE | CLAS | CL_SALV_TREE |
| CL_GUI_FRONTEND_SERVICES | CLAS | Not available |

## Migration Tips

1. **Identify forbidden objects** - Use Clean Core checker
2. **Find replacement** - Check SAP documentation
3. **Refactor code** - Replace with released APIs
4. **Test thoroughly** - Verify functionality
5. **Document changes** - Note migration decisions

## Documentation Links

- [SAP Released Objects](https://api.sap.com/api/ReleasedObjects)
- [ABAP Cloud Migration Guide](https://help.sap.com/doc/abap-cloud)
- [RAP Business Objects](https://help.sap.com/doc/abap-rap)
