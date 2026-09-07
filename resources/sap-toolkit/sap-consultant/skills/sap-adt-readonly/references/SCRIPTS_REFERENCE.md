# SAP ADT Scripts Reference

Complete catalog of all wrapper scripts with full usage examples.

**All scripts support:**
- `--cwd` parameter to specify working directory (contains `.conn_adt`)
- Proper Windows UTF-8 handling and ASCII-only output (`[OK]`, `[FAIL]`, `[ERROR]`)
- Exit codes: 0 = success, 1 = failure
- `--help` flag for usage information

---

## Core Libraries (Not Direct Scripts)

| File | Purpose |
|------|---------|
| `sap_client.py` | **Main interface** - SAPClient class for all operations |
| `sap_adt_lib.py` | Low-level ADT REST API library (SAPADTClient class) |
| `object_types.py` | Object type mappings and URL helpers |

---

## Connection & Discovery Scripts

| Script | Purpose | Key Args |
|--------|---------|----------|
| `run_check_logon.py` | Check SAP connection | `--cwd` |
| `list_transports.py` | List transport requests | `--modifiable-only --cwd` |
| `check_package.py` | Check if package exists | `--name ZAI_T --cwd` |
| `create_package.py` | Create a package | `--name --description --super-package --transport --cwd` |
| `list_package_contents.py` | List objects in package | `--package ZAI --cwd` |
| `search_objects.py` | Search by pattern | `--query "ZAI*" --type CLAS --cwd` |

### Examples

```bash
# Check connection
cd "${SAP_ADT_SCRIPTS_DIR}" && python run_check_logon.py --cwd "C:\project"

# List modifiable transports
cd "${SAP_ADT_SCRIPTS_DIR}" && python list_transports.py --cwd "C:\project" --modifiable-only

# Filter transports by description
cd "${SAP_ADT_SCRIPTS_DIR}" && python list_transports.py --cwd "C:\project" --filter "ZAI"

# List package contents
cd "${SAP_ADT_SCRIPTS_DIR}" && python list_package_contents.py --package ZAI --cwd "C:\project"

# Search for classes
cd "${SAP_ADT_SCRIPTS_DIR}" && python search_objects.py --query "ZAI*" --type CLAS --cwd "C:\project"
```

---

## Read Operation Scripts

| Script | Purpose | Key Args |
|--------|---------|----------|
| `download_object.py` | Download object source (ABAP or DDIC) | `--name --type --cwd` |
| `download_ddic_objects.py` | Batch download all DDIC from package | `--package --cwd` |
| `get_object_metadata.py` | Get object structure | `--name --cwd` |
| `run_sql_query.py` | Execute SELECT query | `--query --max-rows --format --cwd` |
| `syntax_check.py` | Check syntax | `--name --cwd` |
| `activate_object.py` | Activate object (ABAP or DDIC) | `--name --type --cwd` |

### Examples

```bash
# Download class
cd "${SAP_ADT_SCRIPTS_DIR}" && python download_object.py --name ZCL_MY_CLASS --cwd "C:\project"

# Download DDIC domain
cd "${SAP_ADT_SCRIPTS_DIR}" && python download_object.py --name ZAI_D_TEST --type domain --cwd "C:\project"

# Download DDIC data element
cd "${SAP_ADT_SCRIPTS_DIR}" && python download_object.py --name ZAI_E_TEST --type dataelement --cwd "C:\project"

# Batch download all DDIC objects from a package
cd "${SAP_ADT_SCRIPTS_DIR}" && python download_ddic_objects.py --package ZAI --cwd "C:\project"

# Dry run (list without downloading)
cd "${SAP_ADT_SCRIPTS_DIR}" && python download_ddic_objects.py --package ZAI --dry-run --cwd "C:\project"

# Download without saving (print to stdout)
cd "${SAP_ADT_SCRIPTS_DIR}" && python download_object.py --name ZCL_MY_CLASS --no-save --cwd "C:\project"

# Get metadata (token-efficient)
cd "${SAP_ADT_SCRIPTS_DIR}" && python get_object_metadata.py --name ZCL_MY_CLASS --cwd "C:\project"

# Run SQL query (default table format, auto-sized columns)
cd "${SAP_ADT_SCRIPTS_DIR}" && python run_sql_query.py --query "SELECT * FROM ZAI_T_CONFIG" --max-rows 10 --cwd "C:\project"

# SQL query with JSON output
cd "${SAP_ADT_SCRIPTS_DIR}" && python run_sql_query.py --query "SELECT * FROM ZAI_T_CONFIG" --max-rows 10 --format json --cwd "C:\project"

# SQL query with CSV output and selected columns
cd "${SAP_ADT_SCRIPTS_DIR}" && python run_sql_query.py --query "SELECT * FROM ZAI_T_CONFIG" --max-rows 10 --format csv --columns UNAME,MODEL --cwd "C:\project"

# SQL query with column width limit (truncates long values with ...)
cd "${SAP_ADT_SCRIPTS_DIR}" && python run_sql_query.py --query "SELECT * FROM ZAI_T_HISTORY" --max-rows 5 --max-col-width 30 --cwd "C:\project"

# Syntax check
cd "${SAP_ADT_SCRIPTS_DIR}" && python syntax_check.py --name ZCL_MY_CLASS --cwd "C:\project"

# Activate object
cd "${SAP_ADT_SCRIPTS_DIR}" && python activate_object.py --name ZCL_MY_CLASS --cwd "C:\project"
```

---

## Write Operation Scripts

| Script | Purpose | Key Args |
|--------|---------|----------|
| `create_transport.py` | Create transport request | `--description --package --cwd` |
| `create_object.py` | Create class/program/interface | `--name --type --package --description --transport --cwd` |
| `push_object.py` | Push changes to SAP | `--name --transport --cwd` |
| `delete_object.py` | Delete object | `--name --transport --yes --cwd` |

### Examples

```bash
# Create transport
cd "${SAP_ADT_SCRIPTS_DIR}" && python create_transport.py --description "New features" --package ZAI --cwd "C:\project"

# Create class
cd "${SAP_ADT_SCRIPTS_DIR}" && python create_object.py --name ZCL_NEW --type class --package ZAI --description "New class" --transport TRXXXXX --cwd "C:\project"

# Create program
cd "${SAP_ADT_SCRIPTS_DIR}" && python create_object.py --name ZAI_P_REPORT --type program --package ZAI --description "Report" --transport TRXXXXX --cwd "C:\project"

# Push changes (auto-detects local file)
cd "${SAP_ADT_SCRIPTS_DIR}" && python push_object.py --name ZCL_MY_CLASS --transport TRXXXXX --cwd "C:\project"

# Push with explicit source file
cd "${SAP_ADT_SCRIPTS_DIR}" && python push_object.py --name ZCL_MY_CLASS --source-file /path/to/ZCL_MY_CLASS.abap --transport TRXXXXX --cwd "C:\project"

# Delete object (with confirmation prompt)
cd "${SAP_ADT_SCRIPTS_DIR}" && python delete_object.py --name ZCL_OLD --transport TRXXXXX --cwd "C:\project"

# Delete object (skip confirmation - for automated scripts)
cd "${SAP_ADT_SCRIPTS_DIR}" && python delete_object.py --name ZCL_OLD --transport TRXXXXX --yes --cwd "C:\project"
```

---

## DDIC Object Creation Scripts

| Script | Purpose | Key Args |
|--------|---------|----------|
| `create_domain.py` | Create DDIC domain | `--name --datatype --length --description --package --transport --cwd` |
| `create_dataelement.py` | Create data element | `--name --domain --description --package --transport --cwd` |
| `create_structure.py` | Create structure | `--name --fields (JSON) --description --package --transport --cwd` |
| `create_table.py` | Create database table | `--name --ref-structure OR --fields (JSON) --description --package --transport --cwd` |
| `create_table_type.py` | Create table type | `--name --row-type --description --package --transport --cwd` |
| `create_cds_view.py` | Create CDS view | `--name --source-file --description --package --transport --cwd` |
| `create_message_class.py` | Create message class | `--name --description --package --transport --cwd` |
| `create_lock_object.py` | Create lock object | `--name --primary-table --lock-fields (JSON) --description --package --transport --cwd` |

### Examples

```bash
# Create domain with fixed values
cd "${SAP_ADT_SCRIPTS_DIR}" && python create_domain.py --name ZAI_D_STATUS --datatype CHAR --length 1 --description "Status" --package ZAI --transport TRXXXXX --fixed-values '[{"value":"A","text":"Active"},{"value":"I","text":"Inactive"}]' --cwd "C:\project"

# Create data element with labels
cd "${SAP_ADT_SCRIPTS_DIR}" && python create_dataelement.py --name ZAI_E_STATUS --domain ZAI_D_STATUS --description "Status field" --package ZAI --transport TRXXXXX --short-label "Stat" --medium-label "Status" --long-label "Status Field" --cwd "C:\project"

# Create structure
cd "${SAP_ADT_SCRIPTS_DIR}" && python create_structure.py --name ZAI_S_CUSTOMER --fields '[{"name":"CUSTOMER_ID","type":"char10"},{"name":"CUSTOMER_NAME","type":"char50"}]' --description "Customer structure" --package ZAI --transport TRXXXXX --cwd "C:\project"

# Create table with reference structure (recommended)
cd "${SAP_ADT_SCRIPTS_DIR}" && python create_table.py --name ZAI_T_CONFIG --description "Config table" --package ZAI --ref-structure ZAI_S_CONFIG --transport TRXXXXX --cwd "C:\project"

# Create table with direct fields
cd "${SAP_ADT_SCRIPTS_DIR}" && python create_table.py --name ZAI_T_CONFIG --description "Config table" --package ZAI --fields '[{"name":"CLIENT","type":"mandt","key":true},{"name":"ID","type":"char10","key":true}]' --transport TRXXXXX --cwd "C:\project"

# Create table type
cd "${SAP_ADT_SCRIPTS_DIR}" && python create_table_type.py --name ZAI_TT_CUSTOMERS --row-type ZAI_S_CUSTOMER --description "Table of customers" --package ZAI --transport TRXXXXX --cwd "C:\project"

# Create CDS view
cd "${SAP_ADT_SCRIPTS_DIR}" && python create_cds_view.py --name ZAI_C_CUSTOMER --source-file /path/to/view.ddl --description "Customer view" --package ZAI --transport TRXXXXX --cwd "C:\project"

# Create message class
cd "${SAP_ADT_SCRIPTS_DIR}" && python create_message_class.py --name ZAI_MSG --description "ZAI Messages" --package ZAI --transport TRXXXXX --cwd "C:\project"

# Create lock object
cd "${SAP_ADT_SCRIPTS_DIR}" && python create_lock_object.py --name EZAI_CUSTOMER --primary-table ZAI_T_CUSTOMER --lock-fields '["CUSTOMER_ID"]' --description "Customer lock" --package ZAI --transport TRXXXXX --cwd "C:\project"
```

---

## Function Module Scripts

| Script | Purpose | Key Args |
|--------|---------|----------|
| `create_function_group.py` | Create function group | `--name --description --package --transport --cwd` |
| `create_function_module.py` | Create function module | `--name --function-group --description --transport --cwd` |
| `create_type_group.py` | Create type group | `--name --source-file --description --package --transport --cwd` |

### Examples

```bash
# Create function group
cd "${SAP_ADT_SCRIPTS_DIR}" && python create_function_group.py --name ZAI_FG_CUSTOMER --description "Customer Function Modules" --package ZAI --transport TRXXXXX --cwd "C:\project"

# Create function module (parameters must be added via SAP GUI SE37)
cd "${SAP_ADT_SCRIPTS_DIR}" && python create_function_module.py --name ZAI_GET_CUSTOMER --function-group ZAI_FG_CUSTOMER --description "Get Customer Data" --transport TRXXXXX --cwd "C:\project"

# Create type group
cd "${SAP_ADT_SCRIPTS_DIR}" && python create_type_group.py --name ZAITY --source-file /path/to/types.txt --description "ZAI Type Definitions" --package ZAI --transport TRXXXXX --cwd "C:\project"
```

**Note:** For CLI args, use quoted paths only. Use raw strings (`r'...'`) only inside Python heredocs.

---

## CDS Ecosystem Scripts

| Script | Purpose | Key Args |
|--------|---------|----------|
| `create_cds_view.py` | Create CDS view (DDL) | `--name --source-file --description --package --transport --cwd` |
| `create_metadata_extension.py` | Create Metadata Extension (DDLX) | `--name --source-file --description --package --transport --cwd` |
| `create_access_control.py` | Create Access Control (DCL) | `--name --source-file --description --package --transport --cwd` |
| `run_data_preview.py` | Preview data from tables/views/CDS | `--object-name --max-rows --format --cwd` |

### Examples

```bash
# Create CDS metadata extension (UI annotations)
cd "${SAP_ADT_SCRIPTS_DIR}" && python create_metadata_extension.py --name ZAI_E_CUSTOMER --source-file /path/to/annotations.ddlx --description "Customer UI annotations" --package ZAI --transport TRXXXXX --cwd "C:\project"

# Create CDS access control (authorization)
cd "${SAP_ADT_SCRIPTS_DIR}" && python create_access_control.py --name ZAI_A_CUSTOMER --source-file /path/to/auth.dcl --description "Customer access control" --package ZAI --transport TRXXXXX --cwd "C:\project"

# Preview table data (SELECT * equivalent)
cd "${SAP_ADT_SCRIPTS_DIR}" && python run_data_preview.py --object-name ZAI_T_CONFIG --max-rows 50 --cwd "C:\project"

# Preview with WHERE filter
cd "${SAP_ADT_SCRIPTS_DIR}" && python run_data_preview.py --object-name ZAI_T_HISTORY --max-rows 10 --where "MODEL = 'gpt-5.2-chat'" --cwd "C:\project"

# Preview with JSON output and selected columns
cd "${SAP_ADT_SCRIPTS_DIR}" && python run_data_preview.py --object-name ZAI_T_HISTORY --max-rows 5 --format json --columns UNAME,MODEL,TOTAL_TOKENS --cwd "C:\project"

# Preview CDS view data
cd "${SAP_ADT_SCRIPTS_DIR}" && python run_data_preview.py --object-name ZAI_C_CUSTOMER --max-rows 100 --cwd "C:\project"
```

---

## RAP (RESTful Application Programming) Scripts

| Script | Purpose | Key Args |
|--------|---------|----------|
| `create_service_definition.py` | Create service definition (SRVD) | `--name --source-file --description --package --transport --cwd` |
| `create_service_binding.py` | Create service binding (SRVB) | `--name --service-definition --binding-type --description --package --transport --cwd` |
| `create_behavior_definition.py` | Create behavior definition (BDEF) | `--name --source-file --description --package --transport --cwd` |

### Examples

```bash
# Create service definition
cd "${SAP_ADT_SCRIPTS_DIR}" && python create_service_definition.py --name ZAI_SRVD_CUSTOMER --source-file /path/to/srvd.srvd --description "Customer Service" --package ZAI --transport TRXXXXX --cwd "C:\project"

# Create service binding (OData V4 UI)
cd "${SAP_ADT_SCRIPTS_DIR}" && python create_service_binding.py --name ZAI_SRVB_CUSTOMER --service-definition ZAI_SRVD_CUSTOMER --binding-type ODATA_V4_UI --description "Customer OData V4" --package ZAI --transport TRXXXXX --cwd "C:\project"

# Create behavior definition
cd "${SAP_ADT_SCRIPTS_DIR}" && python create_behavior_definition.py --name ZAI_BDEF_CUSTOMER --source-file /path/to/bdef.bdef --description "Customer CRUD" --package ZAI --transport TRXXXXX --cwd "C:\project"
```

**Note:** These scripts are planned for implementation. See [RAP_CDS_OBJECTS.md](RAP_CDS_OBJECTS.md) for confirmed API details.

---

## Code Analysis & Quality Scripts

| Script | Purpose | Key Args |
|--------|---------|----------|
| `where_used.py` | Find all usages of an object | `--object-name --object-type --cwd` |
| `run_pretty_printer.py` | Format ABAP source code | `--object-name --object-type --cwd` |
| `run_atc_check.py` | Run ATC code quality checks | `--object-name --object-type --variant --cwd` |
| `list_inactive_objects.py` | List objects not yet activated | `--cwd` |
| `get_object_structure.py` | Show object sub-components | `--object-name --object-type --cwd` |
| `get_system_info.py` | Get SAP system information | `--cwd` |

### Examples

```bash
# Find where a class is used
cd "${SAP_ADT_SCRIPTS_DIR}" && python where_used.py --object-name ZCL_MY_CLASS --object-type class --cwd "C:\project"

# Find where a CDS view is used
cd "${SAP_ADT_SCRIPTS_DIR}" && python where_used.py --object-name ZAI_C_CUSTOMER --object-type cds --cwd "C:\project"

# Format ABAP source code (pretty print)
cd "${SAP_ADT_SCRIPTS_DIR}" && python run_pretty_printer.py --object-name ZCL_MY_CLASS --object-type class --cwd "C:\project"

# Run ATC checks on a class
cd "${SAP_ADT_SCRIPTS_DIR}" && python run_atc_check.py --object-name ZCL_MY_CLASS --object-type class --cwd "C:\project"

# Run ATC checks on entire package
cd "${SAP_ADT_SCRIPTS_DIR}" && python run_atc_check.py --object-name ZAI --object-type package --variant DEFAULT --cwd "C:\project"

# List inactive objects (pending activation)
cd "${SAP_ADT_SCRIPTS_DIR}" && python list_inactive_objects.py --cwd "C:\project"

# Get object structure (class methods, table fields, etc.)
cd "${SAP_ADT_SCRIPTS_DIR}" && python get_object_structure.py --object-name ZCL_MY_CLASS --object-type class --cwd "C:\project"

# Get SAP system information
cd "${SAP_ADT_SCRIPTS_DIR}" && python get_system_info.py --cwd "C:\project"
```

---

## Python Usage Pattern

**CRITICAL ORDER:** Set the working directory BEFORE any SAP imports:

```python
import sys
sys.path.insert(0, '${SAP_ADT_SCRIPTS_DIR}')

from sap_adt_lib import set_explicit_working_dir
set_explicit_working_dir('${CLAUDE_CWD:-${PWD}}')

from sap_client import SAPClient
client = SAPClient()
```

### Heredoc Pattern (for multi-line Python)

```bash
cd "${SAP_ADT_SCRIPTS_DIR}" && python - --cwd "${CLAUDE_CWD:-${PWD}}" <<'PY'
import sys
sys.path.insert(0, '.')
from sap_adt_lib import set_explicit_working_dir
set_explicit_working_dir('${CLAUDE_CWD:-${PWD}}')
from sap_client import SAPClient
client = SAPClient()
result = client.list_package_contents('ZAI')
print(result)
PY
```

### Debugging

```bash
# Enable debug logging (set before SAPClient init)
# Windows (PowerShell)
$env:ADT_SAP_DEBUG = "1"

# Git Bash
export ADT_SAP_DEBUG=1
```

Debug log: `sap_adt_debug.log` in the Claude working directory.

### Script Execution Rules

**MANDATORY:** Do **not** use `python -c` for SAP ADT work. Use existing scripts or heredoc pattern.

**FORBIDDEN:**
- NEVER create temporary files like `temp_xxx.py` or `tmp_xxx.py`
- NEVER create scripts in the user's project directory
- NEVER use `python -c` for multi-line or complex code
