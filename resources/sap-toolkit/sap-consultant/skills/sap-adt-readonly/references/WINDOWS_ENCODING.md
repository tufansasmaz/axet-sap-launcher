# Windows Console Encoding Rules

**ALL Python output MUST use ASCII-only characters on Windows.**

Windows console uses `cp1252` encoding which **CANNOT** display Unicode symbols.

---

## The Golden Rule

**NEVER use Unicode symbols in print() statements:**

```python
# WRONG - Causes UnicodeEncodeError:
print('Status: ✓')           # \u2713 checkmark
print('Status: ✗')           # \u2717 cross
print('Result: →')            # \u2192 arrow
print('Done: ✅')             # \u2705 green check
print('Error: ❌')            # \u274c cross mark
print('Info: ℹ️')             # \u2139 info

# CORRECT - ASCII only:
print('[OK] Status: passed')
print('[FAIL] Status: failed')
print('Result: success')
print('Done: complete')
print('Error: failed')
```

---

## Complete ASCII Reference Table

| Use Case | Unicode Symbol | WRONG | CORRECT (ASCII) |
|----------|---------------|-------|-----------------|
| Success | checkmark, green check | `print('✅')` | `print('[OK]')` |
| Failure | cross, red X | `print('❌')` | `print('[FAIL]')` |
| Arrow | arrows | `print('→')` | `print('to')` |
| Progress | blocks | `print('▓')` | `print('#')` |
| Bullets | bullets | `print('•')` | `print('-')` |
| Warning | warning emoji | `print('⚠️')` | `print('[WARNING]')` |
| Info | info emoji | `print('ℹ️')` | `print('[INFO]')` |
| Stars | stars | `print('★')` | `print('*')` |

---

## How to Fix Existing Code

**Find and replace these patterns:**

```python
# Replace all occurrences:
s/✓/[OK]/g
s/✗/[FAIL]/g
s/→/to/g
s/✅/[OK]/g
s/❌/[FAIL]/g
s/⚠/[WARNING]/g
s/ℹ/[INFO]/g
```

---

## Technical Explanation

```python
# Windows console encoding:
import sys
print(sys.stdout.encoding)  # 'cp1252' on Windows

# These characters are NOT in cp1252:
'\u2713'  # checkmark
'\u2192'  # arrow
'\u2705'  # green check

# Result: UnicodeEncodeError
```

---

## Force UTF-8 (If You Must)

**Only use this if absolutely necessary:**

```python
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(
        sys.stdout.buffer,
        encoding='utf-8',
        errors='replace'
    )

# Now Unicode works, BUT:
# - May display wrong characters if font doesn't support them
# - Still may fail in some terminals
# - NOT recommended for production code
```

**BEST PRACTICE:** Just use ASCII - it always works!

---

## Code Review Checklist

**BEFORE committing any Python code, verify:**

- [ ] No Unicode checkmarks (checkmark, cross, check, green check)
- [ ] No Unicode arrows (right arrow, left arrow, up, down)
- [ ] No Unicode bullets (bullet, circle, filled circle)
- [ ] No emoji (warning, info, cross mark, sparkles)
- [ ] All status messages use `[OK]`/`[FAIL]` instead
- [ ] All print statements use ASCII-only characters

**Quick grep check before committing:**

```bash
# Search for problematic Unicode in Python files:
grep -r "✓\|✗\|→\|✅\|❌\|⚠️\|ℹ️" *.py
```

**If found, replace with:**

```python
# Status symbols:
'✓' -> '[OK]'
'✗' -> '[FAIL]'
'✅' -> '[OK]'
'❌' -> '[FAIL]'

# Arrows:
'→' -> 'to'
'←' -> 'from'

# Bullets:
'•' -> '-'
'●' -> '*'

# Warnings:
'⚠️' -> '[WARNING]'
'ℹ️' -> '[INFO]'
```

---

## Windows Path Handling in Python

**When passing Windows paths to Python functions in heredoc code, ALWAYS use one of these:**

1. **Raw string (preferred):** `r'C:\Workspace\project\folder'`
2. **Forward slashes:** `'C:/Workspace/project/folder'`
3. **Double backslashes:** `'C:\\Workspace\\project\\folder'`

**WRONG:** `'C:\Workspace\project\folder'` - SyntaxError due to `\N`, `\t`, etc. being interpreted as escape sequences

**Example correct pattern:**

```bash
cd "${SAP_ADT_SCRIPTS_DIR}" && python - --cwd "${CLAUDE_CWD:-${PWD}}" <<'PY'
import sys
sys.path.insert(0, '.')
from sap_adt_lib import set_explicit_working_dir
set_explicit_working_dir(r'C:\Workspace\NTT_TR_SUPPORT\AI Sap CoPilot')  # Use r'' for Windows paths!
from sap_client import SAPClient
PY
```
