# Clean Core Checker API Reference

`scripts/clean_core_checker.py` — command line and Python. Both return the same
result; the command line prints it as text or, with `--json`, as the dict below.

## Command line

```bash
py clean_core_checker.py OBJ [OBJ ...] [--system-type T] [--version V | --s4core R --sp N] [--level L] [--json]
```

| option | values | default |
|---|---|---|
| `--system-type` | `public_cloud`, `btp`, `private_cloud`, `on_premise` | `public_cloud` |
| `--version` | `latest`, or a repository release such as `2023_3` (private_cloud / on_premise only) | `latest` |
| `--s4core` + `--sp` | S4CORE release (107, 108, 109) and support package, instead of `--version` | — |
| `--level` | highest acceptable Clean Core level, `A`–`D` | `A` |

Objects may be separated by spaces or commas; a leading word `compliance` is ignored.

**Exit code:** `0` every object verified online · `3` at least one not verified (the
report is still complete) · `2` the request was wrong (unknown target, a release the
repository does not list, no objects).

```
Clean Core check
============================================================
Source: online -- ROSA https://.../api (SAP Cloudification Repository), 2026-09-28
Target: private_cloud / 2023_3 / level B
Objects: 5 -- allowed 2, not allowed 2, not verified 1; verified online 4/5

  MARA: NOT ALLOWED (TABL, level C, notToBeReleased) [online]
    Successors: I_PRODUCT, I_PRODUCTQM, I_PRODUCTSALES ... and 2 more
  EKKO: NOT ALLOWED (TABL, level C, notToBeReleased) [online]
    Successors: I_PURCHASEORDERAPI01
  CL_GUI_ALV_GRID: ALLOWED (CLAS, level B, classicAPI) [online]
  SAP_WAPI_START_WORKFLOW: ALLOWED (FUNC, level B, classicAPI) [online]
  MBEW: NOT VERIFIED [online]
    SAP's repository has no entry for this object on this target
```

Offline, the Source line reads `OFFLINE -- endpoint not usable (...); bundled
snapshot taken <date> for public_cloud / latest / level A` and the run adds
*"Nothing below is verified."*

## Python

```python
from clean_core_checker import check_compliance, get_object_details, get_successor, TargetError

run = check_compliance(["MARA", "EKKO"], system_type="private_cloud", s4core="108", sp="3", level="B")
```

`check_compliance(object_names, system_type=None, version=None, level=None, s4core=None, sp=None)`
raises `TargetError` for a request it cannot answer as asked, and otherwise returns:

```python
{
  "source": {"mode": "online" | "offline", "endpoint": "...", "date": "2026-09-28",
             "text": "...", "offline_reason": "..."},        # offline_reason only offline
  "target": {"system_type": "private_cloud", "version": "2023_3", "level": "B"},
  "target_is_default": False,       # True -> answered for public cloud, see "warnings"
  "all_verified": False,
  "exit_code": 3,
  "counts": {"allowed": 2, "not_allowed": 2, "not_verified": 1, "total": 5, "verified": 4},
  "warnings": [],
  "results": [                      # every requested object, in the order given
    {"object": "MARA", "verdict": "not_allowed", "verified": True, "source": "online",
     "object_type": "TABL", "level": "C", "state": "notToBeReleased",
     "successors": [{"object": "I_PRODUCT", "object_type": "CDS_STOB"}], "note": ""},
  ],
}
```

- `verdict` — `allowed`, `not_allowed` or `not_verified`.
- `verified` — `True` only when the repository answered **online** for exactly the
  requested target. A caller that writes a release status into a document tests this.
- `source` per object — `online`, `bundled` (the offline snapshot) or `none`.

`get_object_details(name, **target)` returns one object's entry plus `source_text` and
`target`. `get_successor(name, **target)` returns the first successor as
`{"object", "object_type", "verified", "source"}`, or `None`.

## Endpoint

ROSA's public instance by default, `ROSA_BASE_URL` (without `/api`) to override. The
checker calls `/api/compliance` (and `/api/versions` when a release is named).

ROSA answers for **public cloud** when it is handed a system type or level it does
not know, instead of refusing. The checker therefore validates the target itself and
compares the target ROSA echoes back with the one asked for; a mismatch is reported as
not verified.

## Offline

No endpoint, an HTTP error, or a mismatched answer → the bundled snapshot
(`BUNDLED` in the script: date, target, and ~17 classic objects above level A). It can
say `not_allowed` (unverified) for those, for the public-cloud target it was taken for.
It never says `allowed`. Every other object is `not_verified`.

## Documentation Links

- [SAP Cloudification Repository](https://github.com/SAP/abap-atc-cr-cv-s4hc)
- [ROSA](https://github.com/ClementRingot/ROSA)
