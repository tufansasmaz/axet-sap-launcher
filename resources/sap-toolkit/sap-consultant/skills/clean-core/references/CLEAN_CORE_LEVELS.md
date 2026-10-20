# Clean Core levels

What the four letters mean, as SAP's Cloudification Repository states them. What a
**project** does with each letter is a different question, answered by its profile:
[`PROFILES.md`](PROFILES.md).

This file was rewritten on 2026-10-01. The version before it called level A
"recommended" and level D "forbidden", listed `MARA` and `BSEG` as level D and offered
`CL_SALV_TABLE` as the level A successor of `CL_GUI_ALV_GRID`. The repository says none
of that: the tables are level C, both ALV classes are level B on Private Cloud and have
no Public Cloud entry at all.

## The levels

| Level | State in the repository | Meaning |
|---|---|---|
| **A** | `released` | A released API. Usable in ABAP Cloud, stable across upgrades by contract. |
| **B** | `classicAPI` | A classic API SAP stands behind (many BAPIs, `CL_SALV_TABLE`, `CL_GUI_ALV_GRID`). Usable in classic ABAP on Private Cloud and on-premise, not in ABAP Cloud. |
| **C** | `notToBeReleased`, internal | Not an API. SAP may change it in an upgrade. Often has a successor at level A — `MARA` → `I_PRODUCT`, `EKKO` → `I_PURCHASEORDERAPI01`. |
| **D** | `deprecated`, `noAPI` | Do not use. |

Measured on 2026-10-01 for Private Cloud, S/4HANA 2025 FPS01:

| Object | Level | Successor |
|---|---|---|
| `I_PRODUCT` | A | — |
| `CL_SALV_TABLE`, `CL_GUI_ALV_GRID`, `BAPI_PO_CREATE1` | B | — |
| `MARA`, `EKKO`, `VBAK` | C | `I_PRODUCT`, `I_PURCHASEORDERAPI01`, `I_SALESDOCUMENT` |
| `BAPI_SALESORDER_CREATEFROMDAT2` | C | `I_SALESORDERTP` |
| `BADI_SD_SALES`, `REUSE_ALV_GRID_DISPLAY` | no entry | — |

Three things this table shows, each of which surprised a document at some point:

- **Reading a standard table is level C, not level D.** It is the most common Clean Core
  finding and it is not a prohibition by itself; the profile decides.
- **Not every BAPI is a classic API.** `BAPI_PO_CREATE1` is level B; the sales-order BAPI
  everyone uses is level C with a RAP successor.
- **"No entry" is common and is not a level.** The repository lists what SAP classified.
  Many classic BAdIs and function modules are simply absent; the checker reports them as
  not verified, never as allowed.

## The level depends on the target

The same object has a different answer per product and release. `CL_SALV_TABLE` is level
B on Private Cloud and has no entry on Public Cloud; a level quoted without its target is
not an answer. Always pass the project's product and release:

```bash
py scripts/clean_core_checker.py MARA EKKO CL_SALV_TABLE --profile s4-balanced --s4core 109 --sp 1
py scripts/clean_core_checker.py MARA EKKO CL_SALV_TABLE --system-type private_cloud --s4core 108 --sp 3 --level B
```

`--s4core`: 107 = S/4HANA 2022, 108 = 2023, 109 = 2025 (there is no 2024 release).

## Finding the successor

The checker prints the successors SAP names. When it names none, there is none on
record: do not infer one from a naming pattern. `COMMON_REPLACEMENTS.md` has worked
examples; the checker's answer for the project's target wins over anything written there.
