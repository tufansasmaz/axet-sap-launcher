# SAPClient API Reference

Complete API documentation for the `SAPClient` class and DDIC object creation examples.

---

## Initialization

```python
import sys
sys.path.insert(0, '${SAP_ADT_SCRIPTS_DIR}')

from sap_adt_lib import set_explicit_working_dir
set_explicit_working_dir('${CLAUDE_CWD:-${PWD}}')
from sap_client import SAPClient

client = SAPClient()
```

**CRITICAL:** Always call `set_explicit_working_dir()` BEFORE importing `sap_client`.

---

## Connection Methods

```python
# Check configuration (no SAP call)
status = SAPClient.check_sap_config()
# Returns: {'configured': bool, 'conn_exists': bool, 'conn_path': str, 'missing': list, 'placeholders': list}

# Check logon (calls SAP)
result = SAPClient.check_logon()
```

---

## Object Operations

```python
# Download object from SAP to local file
source = client.download_object('ZCL_MY_CLASS', 'class')
# Saves to: project_root/ERP/ZAI/classes/ZCL_MY_CLASS.abap

# Push local file to SAP (lock -> upload -> activate -> unlock)
result = client.push_object('ZCL_MY_CLASS', 'class', transport='TRXXXXXX')
# result = {'success': bool, 'error': str, 'error_type': str,
#           'source_uploaded': bool, 'activated': bool, 'lock_released': bool}

# Create new object
url = client.create_object('class', 'ZCL_NEW', 'ZPACKAGE', 'Description', 'TRXXXXXX')

# Delete object
client.delete_object('ZCL_OLD', 'class', transport='TRXXXXXX')
```

---

## Search and Discovery

```python
# Search for objects (supports wildcards like 'ZAI*')
results = client.search_objects('ZAI*', max_results=50)

# List all objects in a package
objects = client.list_package_contents('ZPACKAGE')

# Get metadata without downloading full source (token-efficient)
metadata = client.get_object_metadata('ZCL_MY_CLASS', 'class')
```

---

## Code Quality

```python
# Check syntax without activating
result = client.syntax_check('ZCL_MY_CLASS', 'class')

# Activate object (retry after failed push)
success = client.activate_object('ZCL_MY_CLASS', 'class')

# Run ATC code quality checks
atc_result = client.run_atc_check('ZCL_MY_CLASS', 'class', variant='DEFAULT')
# atc_result = {'findings': [{'priority': '1', 'message': '...', 'location': '...', 'checkId': '...'}]}

# Format source code with Pretty Printer
formatted = client.pretty_print('ZCL_MY_CLASS', 'class')

# Find where an object is used
refs = client.where_used('ZCL_MY_CLASS', 'class')
# refs = [{'name': 'ZCL_OTHER', 'type': 'CLAS/OC', 'uri': '...', 'description': '...'}]

# List inactive objects
inactive = client.list_inactive_objects()

# Get object structure (sub-components)
structure = client.get_structure('ZCL_MY_CLASS', 'class')
# structure = {'components': [{'name': 'METHOD1', 'type': 'CLAS/OM', ...}]}

# Get SAP system info
info = client.get_system_info()
```

---

## CDS Ecosystem

```python
# Create CDS metadata extension
client.create_metadata_extension(
    name='ZAI_E_CUSTOMER',
    source=ddlx_source,
    description='Customer UI annotations',
    package='ZAI',
    transport='TRXXXXXX'
)

# Create CDS access control
client.create_access_control(
    name='ZAI_A_CUSTOMER',
    source=dcl_source,
    description='Customer access control',
    package='ZAI',
    transport='TRXXXXXX'
)
```

---

## RAP Operations

```python
# Create service definition (SRVD)
client.create_service_definition(
    name='ZAI_SRVD_CUSTOMER',
    source=srvd_source,
    description='Customer Service Definition',
    package='ZAI',
    transport='TRXXXXXX'
)

# Create service binding (SRVB)
client.create_service_binding(
    name='ZAI_SRVB_CUSTOMER',
    service_definition='ZAI_SRVD_CUSTOMER',
    binding_type='ODATA_V4_UI',  # Options: ODATA_V2_UI, ODATA_V2_WEB, ODATA_V4_UI, ODATA_V4_WEB, INA, IWSG
    description='Customer OData V4 Binding',
    package='ZAI',
    transport='TRXXXXXX'
)

# Create behavior definition (BDEF)
client.create_behavior_definition(
    name='ZAI_BDEF_CUSTOMER',
    source=bdef_source,
    description='Customer CRUD Operations',
    package='ZAI',
    transport='TRXXXXXX'
)

# Search for RAP objects
srvd_list = client.search_objects('ZAI*', obj_type='SRVD')
bdef_list = client.search_objects('ZAI*', obj_type='BDEF')
srvb_list = client.search_objects('ZAI*', obj_type='SRVB')
ddlx_list = client.search_objects('ZAI*', obj_type='DDLX')
```

---

## Transport Operations

```python
# List user's transport requests
transports = client.list_user_transports()

# Create new transport request
transport_num = client.create_transport('New features', 'ZPACKAGE')
```

---

## Database Operations

```python
# Query returns dict with 'columns', 'data', 'total_rows', 'execution_time'
result = client.run_sql_query("SELECT * FROM ZAI_T_AI_CONFIG", max_rows=10)
if result:
    print(f"Columns: {result['columns']}")
    print(f"Total rows: {result['total_rows']}")
    for row in result['data']:
        print(row)

# DDIC metadata only (NOT table data)
metadata = client.table_contents('MARA', row_limit=100)
```

**Note:** `run_query()` is deprecated. Use `run_sql_query()` instead.

---

## DDIC Object Creation Examples

### Full DDIC Stack Example

```python
import sys
sys.path.insert(0, '${SAP_ADT_SCRIPTS_DIR}')

from sap_adt_lib import set_explicit_working_dir
set_explicit_working_dir('${CLAUDE_CWD:-${PWD}}')
from sap_client import SAPClient
from sap_adt_lib import SAPADTClient

sap_client = SAPClient()
adt_client = SAPADTClient()
transport = 'TRXXXXXX'

# Create domain
sap_client.create_domain(
    name='ZAI_D_STATUS',
    datatype='CHAR',
    length=1,
    description='Status indicator',
    package='ZAI',
    transport=transport,
    fixed_values=[
        {'value': 'A', 'text': 'Active'},
        {'value': 'I', 'text': 'Inactive'}
    ]
)

# Activate domain immediately (REQUIRED)
adt_client.activate_object('ZAI_D_STATUS', '/sap/bc/adt/ddic/domains/zai_d_status')

# Create data element
sap_client.create_dataelement(
    name='ZAI_E_STATUS',
    domain_name='ZAI_D_STATUS',
    description='Status field',
    package='ZAI',
    transport=transport
)

# Activate data element immediately
adt_client.activate_object('ZAI_E_STATUS', '/sap/bc/adt/ddic/dataelements/zai_e_status')

# Create structure
sap_client.create_structure(
    name='ZAI_S_CUSTOMER',
    fields=[
        {'name': 'CUSTOMER_ID', 'type': 'char10'},
        {'name': 'CUSTOMER_NAME', 'type': 'char50'},
    ],
    description='Customer structure',
    package='ZAI',
    transport=transport
)

# Create table
sap_client.create_table(
    name='ZAI_T_CUSTOMER',
    description='Customer table',
    package='ZAI',
    fields=[
        {'name': 'CLIENT', 'type': 'mandt', 'key': True},
        {'name': 'ID', 'type': 'char10', 'key': True},
        {'name': 'NAME', 'type': 'char50'},
    ],
    transport=transport
)

# Create CDS view
cds_source = '''@AbapCatalog.sqlViewName: 'ZAI_C_CUSTOMER'
@AccessControl.authorizationCheck: #CHECK

define view ZAI_C_CUSTOMER as
select from zai_t_customer
{
  key client,
  key id,
  name
}'''

sap_client.create_cds_view(
    name='ZAI_C_CUSTOMER',
    cds_source=cds_source,
    description='Customer view',
    package='ZAI',
    transport=transport
)
```

---

## Error Handling

The library uses typed exceptions:

| Exception | Cause | Solution |
|-----------|-------|----------|
| `SAPConnectionError` | SAP unreachable or timeout | Check ADT_SAP_URL; increase ADT_TIMEOUT_DEFAULT |
| `SAPAuthenticationError` | Invalid credentials (401/403) | Check ADT_SAP_USER/ADT_SAP_PASSWORD |
| `SAPLockError` | Object locked by another user | Wait, ask them, or use SM12 to release |
| `SAPLockError` (same user) | Stale enqueue lock | Auto-recovered: lock-unlock cycle clears it |
| `SAPTransportError` | Transport issue | Use `list_transports.py --modifiable-only` |
| `SAPObjectNotFoundError` | Object doesn't exist | Check object name and type |
| `SAPActivationError` | Syntax or dependency error | Run syntax_check first |
| `SAPADTError` | Generic API error | Check status_code and response_text |

**CSRF token handling is automatic** - the library refreshes expired tokens and retries transparently.

---

## Configuration Setup

```python
from sap_adt_lib import set_explicit_working_dir, create_conn_file
set_explicit_working_dir('${CLAUDE_CWD:-${PWD}}')
from sap_client import SAPClient

status = SAPClient.check_sap_config()

if not status.get("configured"):
    if not status.get("conn_exists"):
        print(f"No .conn_adt file found. Create at: {status.get('conn_path')}")

    create_conn_file(
        sap_url="https://user-provided-server.com:44300",
        sap_user="USERNAME",
        sap_password="PASSWORD",
        sap_client="100"
    )

client = SAPClient()
```
