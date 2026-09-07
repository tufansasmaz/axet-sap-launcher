# SAP ADT Workflows Reference

Detailed workflows for object modification, retry logic, deletion, and package operations.

---

## Object Modification Workflow

**CRITICAL:** Always follow this sequence when modifying SAP objects:

```
1. LOCK     -> Get lock handle from SAP
2. CHANGE   -> Upload modified source code
3. ACTIVATE -> Activate the object
4. UNLOCK   -> Release the lock (always in finally block!)
```

### Why This Order Matters

| Step | Skip It | Risk |
|------|---------|------|
| **Lock** | Don't skip | Someone else might overwrite your changes |
| **Change** | Don't skip | No changes to apply |
| **Activate** | May fail | Same-user locks auto-cleared; other failures need SAP GUI |
| **Unlock** | NEVER SKIP! | Object remains locked forever! |

### Low-Level Pattern (SAPADTClient)

> **CRITICAL**: Always pass `transport` to `lock_object()`. Without it, SAP CTS
> auto-creates a ghost transport and registers the lock under it. The subsequent
> `set_object_source()` call with the real transport then gets a 409 deadlock.
> **Resolve transport BEFORE locking — never after.**

```python
from sap_adt_lib import SAPADTClient

client = SAPADTClient()
object_url = '/sap/bc/adt/oo/classes/zcl_my_class'
transport = 'TRXXXXXX'  # Resolve transport BEFORE locking!
lock_handle = None

try:
    # 1. Lock — MUST pass transport so SAP CTS registers lock under correct corrNr
    lock_handle = client.lock_object(object_url, transport=transport)
    print(f"[1/4] Locked: {lock_handle[:50]}...")

    # 2. Change (upload source)
    client.set_object_source(
        object_url + '/source/main',
        source_code,
        lock_handle,
        transport=transport
    )
    print("[2/4] Source uploaded")

    # 3. Activate
    result = client.activate_object('ZCL_MY_CLASS', object_url)
    if isinstance(result, dict) and result.get('success'):
        print("[3/4] Activated")
    elif result is True:
        print("[3/4] Activated")
    else:
        print("[3/4] Activation failed (user can do it manually)")

finally:
    # 4. Unlock (ALWAYS execute, even if activation fails!)
    if lock_handle:
        try:
            client.unlock_object(object_url, lock_handle)
            print("[4/4] Unlocked")
        except:
            print("[4/4] Unlock failed (may timeout automatically)")
```

### High-Level Pattern (SAPClient)

```python
from sap_client import SAPClient

client = SAPClient()

# This method handles the full workflow automatically:
client.push_object('ZCL_MY_CLASS', 'class', transport='TRXXXXXX')
# Internally: lock -> upload -> activate -> unlock
```

### DDIC Objects (No Lock Required)

DDIC objects don't need locks:
1. Change (upload/create)
2. Activate
3. Done! (no unlock needed)

---

## Automatic Retry Logic for SAP Version Compatibility

Different SAP versions use different namespaces, media types, and parameter formats. The library handles this automatically.

### Object Creation (`create_object`)

The `create_object()` method automatically retries with different combinations:

**What it handles:**
- XML namespaces (e.g., `http://www.sap.com/adt/programs/programs` vs `http://www.sap.com/adt/programs`)
- Media types (e.g., `application/vnd.sap.adt.programs.programs.v2+xml`)
- Extracts correct values from error responses (415, 400 status codes)

**Supported object types:** `PROG/P` (Programs), `CLAS/OC` (Classes), `INTF/OI` (Interfaces)

**Example:**
```python
# No need to worry about namespace/media type compatibility
result = client.create_object(
    obj_type='PROG/P',
    name='ZAI_P_HIST2',
    package_name='ZAI',
    description='Report for history table',
    package_path='/sap/bc/adt/packages/zai',
    transport='FIDK901433'
)
# Method automatically retries with up to 10 different combinations
```

### Source Upload (`set_object_source`)

The `set_object_source()` method automatically retries different transport parameter approaches:

**What it handles:**
- `X-sap-adt-transport` header
- `corrNr` query parameter
- Both header and parameter together
- No transport parameter (for objects that don't need it)
- CSRF token refresh on 403 errors

### Key Principles

1. **Extract from errors:** When SAP returns "Supported Media Types: X" or "expected namespace Y", the library extracts and retries
2. **Deduplication:** Tracks attempted combinations to avoid infinite loops
3. **Max retries:** Configurable via `max_retries` parameter (default: 5-10)
4. **CSRF refresh:** Automatically refreshes token on 403 errors

**When to adjust retry limits:**
- Slow SAP systems: Increase `max_retries`
- Fast systems: Reduce to fail fast
- Testing: Lower values for quicker feedback

---

## Deleting Objects

Deletion via ADT API varies by object type.

### Deletion Support Matrix

| Object Type | Can Delete? | Method | Lock Required? |
|-------------|-------------|--------|---------------|
| **Classes** | Yes | `client.delete_object()` | Yes |
| **Interfaces** | Yes | `client.delete_object()` | Yes |
| **Programs** | Yes | `client.delete_object()` | Yes |
| **Function Groups** | Limited | Direct HTTP DELETE | Yes (complex) |
| **Domains** | Yes | Direct HTTP DELETE | No |
| **Data Elements** | Yes | Direct HTTP DELETE | No |
| **Structures** | Yes | Direct HTTP DELETE | No |
| **Table Types** | Yes | Direct HTTP DELETE | No |
| **CDS Views** | Yes | Direct HTTP DELETE | No |
| **Metadata Extensions** | Yes | Direct HTTP DELETE | No |
| **Access Controls** | Yes | Direct HTTP DELETE | No |
| **Service Definitions** | Yes | Direct HTTP DELETE | No |
| **Service Bindings** | Yes | Direct HTTP DELETE | No |
| **Behavior Definitions** | Yes | Direct HTTP DELETE | No |
| **Message Classes** | Yes | Direct HTTP DELETE | No |
| **Tables** | Limited | SAP GUI SE11 | N/A |

### Deleting DDIC Objects (No Lock Required)

```python
from sap_adt_lib import set_explicit_working_dir, SAPADTClient

set_explicit_working_dir('${CLAUDE_CWD:-${PWD}}')
client = SAPADTClient()

headers = client._get_headers()
# DO NOT add X-sap-adt-lockHandle for DDIC objects!

response = client._request_with_csrf_retry(
    'delete',
    f"{client.url}/sap/bc/adt/ddic/domains/zai_old_domain",
    headers=headers,
    params={'corrNr': 'TRANSPORT_NUMBER'},
    timeout=client.timeout_short,
)

if response.status_code in [200, 204]:
    print("Deleted successfully")
```

### Deleting Classes/Programs (Lock Required)

```python
client = SAPClient()
client.delete_object('ZCL_OLD_CLASS', 'class', transport='TRXXXXXX', confirm=False)
```

**Note:** In non-interactive runs (Claude Code), set `confirm=False` to avoid EOFError from input prompts.

**If deletion fails with 400/403:** Verify CSRF token, lock handle, and transport. Use `tests/adt_lock_delete.ps1` to validate. If still fails, delete via SAP GUI (SE38/SE80).

---

## Package Operations

### Checking if a Package Exists

```bash
cd "${SAP_ADT_SCRIPTS_DIR}" && python check_package.py --name ZAI_T --cwd "${CLAUDE_CWD:-${PWD}}"
```

Returns: Exit code 0 + `[OK]` if exists, exit code 1 + `[INFO]` if not.

### Creating Packages

```bash
cd "${SAP_ADT_SCRIPTS_DIR}" && python create_package.py \
  --name ZAI_T \
  --description "ZAI Types - DDIC objects" \
  --super-package ZAI \
  --transport IEDK934921 \
  --cwd "${CLAUDE_CWD:-${PWD}}"
```

**Required parameters:**
- `--name`: Package name (e.g., `ZAI_T`)
- `--description`: Package description
- `--transport`: Transport request number
- `--cwd`: Working directory containing `.conn_adt`

**Optional parameters:**
- `--super-package`: Parent/super package (for subpackages)
- `--sw-component`: Software component (default: `HOME`, auto-detected from super-package)
- `--transport-layer`: Transport layer (auto-detected from super-package if not specified)
- `--package-type`: `development`, `structure`, or `main` (default: `development`)
- `--responsible`: Responsible user (default: current user)
- `--json`: Output as JSON
- `--skip-validation`: Skip validation before creation

### Examples

```bash
# Create a subpackage (auto-detects sw-component and transport-layer)
cd "${SAP_ADT_SCRIPTS_DIR}" && python create_package.py \
  --name ZAI_T \
  --description "ZAI Types" \
  --super-package ZAI \
  --transport IEDK934921 \
  --cwd "${CLAUDE_CWD:-${PWD}}"

# Create with explicit settings
cd "${SAP_ADT_SCRIPTS_DIR}" && python create_package.py \
  --name ZTEST \
  --description "Test Package" \
  --sw-component HOME \
  --transport-layer ZIED \
  --package-type development \
  --transport TR123456 \
  --cwd "${CLAUDE_CWD:-${PWD}}"
```

### Package Naming Conventions

| Type | Example | Description |
|------|---------|-------------|
| Main package | `ZAI` | Main development package |
| Types subpackage | `ZAI_T` | DDIC types (domains, data elements, structures) |
| Tables subpackage | `ZAI_TB` | Database tables |
| Programs subpackage | `ZAI_P` | Reports and programs |
| Tests subpackage | `ZAI_TESTS` | Unit tests |
