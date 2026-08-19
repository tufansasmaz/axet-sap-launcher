# SAP ABAP Object Types Reference

## Supported Object Types

All scripts now support multiple SAP object types beyond just classes and interfaces.

### Object Types

| Type | Aliases | Description | Can Create | Extension |
|------|---------|-------------|------------|-----------|
| **class** | clas | ABAP Class | ✅ Yes | .clas.abap |
| **interface** | intf | ABAP Interface | ✅ Yes | .intf.abap |
| **program** | prog, report | ABAP Program (Report) | ✅ Yes | .prog.abap |
| **include** | incl | ABAP Include | ✅ Yes | .prog.abap |
| **functiongroup** | fugr | Function Group | ✅ Yes | .fugr.abap |
| **function** | func | Function Module | ❌ No* | .func.abap |

*Function modules are created within function groups, not standalone.

## Usage Examples

### Download Any Object Type

```bash
# Download class (default)
python download_class_from_sap.py ZAI_CL_AI_CLIENT

# Download program/report
python download_class_from_sap.py Z_MY_REPORT program

# Download include
python download_class_from_sap.py Z_MY_INCLUDE include

# Download function group
python download_class_from_sap.py Z_MY_FUNCGROUP functiongroup

# Using aliases
python download_class_from_sap.py Z_MY_REPORT prog
python download_class_from_sap.py Z_MY_FUNCGROUP fugr
```

### Push Any Object Type

```bash
# Push class
python push_class_to_sap.py ZAI_CL_AI_CLIENT class IEDK934921

# Push program
python push_class_to_sap.py Z_MY_REPORT program IEDK934921

# Push include
python push_class_to_sap.py Z_MY_INCLUDE include IEDK934921

# Push function group
python push_class_to_sap.py Z_MY_FUNCGROUP functiongroup IEDK934921
```

### Create Any Object Type

```bash
# Create class
python create_object.py class ZCL_NEW ZAI "New class" IEDK934921

# Create program
python create_object.py program Z_NEW_REPORT ZAI "New report" IEDK934921

# Create include
python create_object.py include Z_NEW_INCLUDE ZAI "New include" IEDK934921

# Create function group
python create_object.py functiongroup Z_NEW_FUNCGROUP ZAI "New function group" IEDK934921
```

### Syntax Check Any Type

```bash
python syntax_check.py ZAI_CL_AI_CLIENT class
python syntax_check.py Z_MY_REPORT program
python syntax_check.py Z_MY_INCLUDE include
```

### Activate Any Type

```bash
python activate_object.py ZAI_CL_AI_CLIENT class
python activate_object.py Z_MY_REPORT program
python activate_object.py Z_MY_FUNCGROUP functiongroup
```

### Unified CLI

```bash
# Download
python sap_workflow.py download Z_MY_REPORT program

# Push
python sap_workflow.py push Z_MY_REPORT program IEDK934921

# Create
python sap_workflow.py create program Z_NEW_REPORT ZAI "Description"

# Syntax check
python sap_workflow.py syntax-check Z_MY_REPORT program

# Activate
python sap_workflow.py activate Z_MY_REPORT program
```

## Object Type Helper Module

The `object_types.py` module provides centralized object type management:

```python
from object_types import (
    get_object_url,
    get_source_url,
    get_adt_type,
    normalize_object_type,
    list_supported_types
)

# Get URL for any object type
url = get_object_url('Z_MY_REPORT', 'program')
# Returns: /sap/bc/adt/programs/programs/z_my_report

# Get source URL
source_url = get_source_url('ZCL_TEST', 'class')
# Returns: /sap/bc/adt/oo/classes/zcl_test/source/main

# Normalize type (handles aliases)
normalized = normalize_object_type('prog')
# Returns: 'program'

# List all supported types
types = list_supported_types()
# Returns: ['class', 'interface', 'program', 'include', 'functiongroup', 'function']
```

## File Naming Convention

When saving objects locally, use these naming patterns:

```
{OBJECT_NAME}{extension}

Examples:
  ZAI_CL_AI_CLIENT.clas.abap      # Class
  ZAI_IF_AI_PROVIDER.intf.abap    # Interface
  Z_MY_REPORT.prog.abap            # Program
  Z_MY_INCLUDE.prog.abap           # Include
  Z_MY_FUNCGROUP.fugr.abap         # Function Group
```

## SAP ADT URL Patterns

### Classes
- Object: `/sap/bc/adt/oo/classes/{name}`
- Source: `/sap/bc/adt/oo/classes/{name}/source/main`

### Interfaces
- Object: `/sap/bc/adt/oo/interfaces/{name}`
- Source: `/sap/bc/adt/oo/interfaces/{name}/source/main`

### Programs
- Object: `/sap/bc/adt/programs/programs/{name}`
- Source: `/sap/bc/adt/programs/programs/{name}/source/main`

### Includes
- Object: `/sap/bc/adt/programs/includes/{name}`
- Source: `/sap/bc/adt/programs/includes/{name}/source/main`

### Function Groups
- Object: `/sap/bc/adt/functions/groups/{name}`
- Source: `/sap/bc/adt/functions/groups/{name}/source/main`

### Function Modules
- Object: `/sap/bc/adt/functions/modules/{name}`
- Source: `/sap/bc/adt/functions/modules/{name}/source/main`

## Adding New Object Types

To add support for additional object types, edit `object_types.py`:

```python
OBJECT_TYPES = {
    'newtype': {
        'adt_type': 'NEWT/NT',
        'url_path': 'path/to/objects',
        'xml_namespace': 'newtype',
        'description': 'New Object Type',
        'supports_create': True,
        'file_extension': '.newt.abap'
    }
}
```

## Migration from Class-Only Scripts

If you have existing scripts that only support classes, you can now pass the object type parameter:

**Before:**
```bash
python download_class_from_sap.py Z_MY_REPORT  # ❌ Fails - not a class
```

**After:**
```bash
python download_class_from_sap.py Z_MY_REPORT program  # ✅ Works!
```

The script names haven't changed (for backward compatibility), but they now support all object types.
