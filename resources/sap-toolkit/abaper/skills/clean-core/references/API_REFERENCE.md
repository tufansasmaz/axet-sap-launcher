# Clean Core Checker API Reference

Reference for using the ABAP Cloud Clean Core checker.

## Installation

The clean-core skill is part of the abaper plugin. No separate installation required.

## Python API

### search_object

Search for an object in the SAP released objects database.

```python
from clean_core_checker import search_object

result = search_object(
    object_name="MARA",
    object_type="TABL"  # Optional
)
```

**Returns:** Dict with object details including release status and successors

```python
{
    "object_name": "MARA",
    "object_type": "TABL",
    "clean_core_level": "C",
    "released": False,
    "successors": [...]
}
```

### get_object_details

Get detailed information about an object.

```python
from clean_core_checker import get_object_details

result = get_object_details(
    object_name="MARA",
    object_type="TABL"  # Optional
)
```

**Returns:** Dict with full object details

```python
{
    "object_name": "MARA",
    "object_type": "TABL",
    "clean_core_level": "C",
    "released": False,
    "category": "notToBeReleased",
    "successors": [
        {
            "object_name": "I_PRODUCT",
            "object_type": "CDS_STOB",
            "description": "Successor for MARA"
        }
    ]
}
```

### check_compliance

Check Clean Core compliance for multiple objects.

```python
from clean_core_checker import check_compliance

result = check_compliance([
    "MARA",
    "BSEG",
    "I_PRODUCT"
])
```

**Returns:** Dict with compliance results and statistics

```python
{
    "targetLevel": "A",
    "system_type": "public_cloud",
    "totalChecked": 3,
    "compliant": 1,
    "nonCompliant": 2,
    "results": [...]
}
```

### get_successor

Get the successor/replacement object for a forbidden object.

```python
from clean_core_checker import get_successor

successor = get_successor("MARA")
if successor:
    print(f"Use {successor['object_name']} instead")
```

**Returns:** Dict with replacement object info or None

```python
{
    "object_name": "I_PRODUCT",
    "object_type": "CDS_STOB",
    "description": "Successor for MARA"
}
```

## Command Line Usage

### Single Object Check

```bash
python clean_core_checker.py MARA
```

Output:
```
Clean Core Status: MARA
==================================================
Object Name: MARA
Object Type: TABL
Clean Core Level: C
Released: False
Category: notToBeReleased

Successors (replacement objects):
  - I_PRODUCT (CDS_STOB)
    Successor for MARA
```

### Multiple Objects Check

```bash
python clean_core_checker.py MARA BSEG CL_GUI_ALV_GRID
```

Output:
```
Clean Core Compliance Check
==================================================
Objects checked: ['MARA', 'BSEG', 'CL_GUI_ALV_GRID']

Compliant: 0/3
Non-Compliant: 2/3

  MARA: [X] FORBIDDEN (Level C)
    notToBeReleased
    Successors: I_PRODUCT, I_PRODUCTPROCUREMENT, I_PRODUCTQM
    ... and 2 more

  BSEG: [X] FORBIDDEN (Level C)
    notToBeReleased
    Successors: I_OPERATIONALACCTGDOCITEM
```

## Common Replacement Cache

The checker includes a local cache of common forbidden objects:

| Object | Type | Level | Replacement |
|--------|------|-------|-------------|
| MARA | TABL | D | I_PRODUCT |
| BSEG | TABL | D | I_OPERATIONALACCTGDOCITEM |
| CL_GUI_ALV_GRID | CLAS | D | CL_SALV_TABLE |
| CL_GUI_ALV_TREE | CLAS | D | CL_SALV_TREE |
| VBAK | TABL | D | None (use BAPIs) |
| T001 | TABL | D | None (use BAPIs) |

## API Endpoint

The checker uses the SAP Released Objects API:

```
https://sap-released-objects-server-production.up.railway.app/api
```

**Endpoints:**
- `/api/search` - Search for objects
- `/api/object` - Get object details
- `/api/compliance` - Batch compliance check
- `/api/successor` - Get successor objects

## Error Handling

### API Unavailable

If the API is unavailable, the checker falls back to cached data:

```python
result = check_compliance(["MARA"])
# Returns cached result even if API is down
```

### Object Not Found

```python
result = get_object_details("UNKNOWN_OBJECT")
# Returns {"error": "Object not found"}
```

### Invalid Object Type

```python
result = search_object("MARA", object_type="INVALID")
# Returns {"error": "API request failed: 400"}
```

## Clean Core Levels Reference

| Level | Description | Action Required |
|-------|-------------|-----------------|
| A | Recommended | Use freely |
| B | Allowed | Use if A unavailable |
| C | Conditional | Check restrictions |
| D | Deprecated/Forbidden | **Must replace** |

## Object Type Codes

| Code | Description |
|------|-------------|
| TABL | Table |
| CLAS | Class |
| INTF | Interface |
| PROG | Program |
| FUGR | Function Group |
| DTEL | Data Element |
| DOMA | Domain |
| CDS_STOB | CDS View Entity (Stub) |
| View | CDS View |

## Examples

### Check Before Using Object

```python
from clean_core_checker import get_object_details

def safe_use_object(object_name):
    result = get_object_details(object_name)
    if result.get("released"):
        return True
    elif result.get("successors"):
        succ = result["successors"][0]
        print(f"WARNING: {object_name} is forbidden. Use {succ['object_name']} instead")
        return False
    return False
```

### Get All Successors

```python
from clean_core_checker import get_object_details

def get_all_successors(object_name):
    result = get_object_details(object_name)
    if "successors" in result:
        return [s["object_name"] for s in result["successors"]]
    return []
```

### Batch Check with Filtering

```python
from clean_core_checker import check_compliance

objects = ["MARA", "BSEG", "I_PRODUCT", "CL_SALV_TABLE"]
result = check_compliance(objects)

# Get only non-compliant objects
non_compliant = [
    r["objectName"] for r in result["results"]
    if r.get("status") == "non_compliant"
]

print(f"Non-compliant objects: {non_compliant}")
```

## Integration with SAP ADT

Combine Clean Core checking with SAP ADT operations:

```python
from sap_client import SAPClient
from clean_core_checker import check_compliance

# 1. Get objects from package
client = SAPClient()
objects = client.list_package_contents("ZMY_PACKAGE")

# 2. Check compliance
obj_names = [o["name"] for o in objects]
compliance = check_compliance(obj_names)

# 3. Report violations
for r in compliance["results"]:
    if r.get("status") == "non_compliant":
        print(f"VIOLATION: {r['objectName']} is not Clean Core compliant")
```

## Documentation Links

- [SAP Released Objects GitHub](https://github.com/SAP-samples/abap-file-formats)
- [ABAP Cloud Clean Core](https://help.sap.com/doc/abap-cloud)
- [Clean Core Checker Source](clean_core_checker.py)
