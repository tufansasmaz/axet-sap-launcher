# SAP Help Portal — Version-Aware ABAP Keyword Documentation Lookup

This workflow is used whenever `%abap_review` (or the user) needs to verify a
syntax rule, keyword restriction, release note, or RAP/BOPF guidance against
the **official SAP ABAP Keyword Documentation**, matched to the ABAP release
of the system we are actually connected to — not just the "latest" docs.

## Why this matters

The default entry point,
`https://help.sap.com/doc/abapdocu_latest_index_htm/latest/en-US/ABENABAP.html`,
always resolves to the **newest** ABAP release. The system connected via
`sap-adt-readonly` may be on an older (or different) `SAP_BASIS` release, so
"latest" documentation can describe syntax, restrictions, or defaults that
don't apply to the actual target system. This workflow pins the lookup to the
system's real release.

## Step 1 — Determine the connected system's ABAP release (source of truth)

Do **not** trust `adt_logon`'s `version` field alone (it has returned
`"unknown"` in this project). Instead, query `CVERS` via the read-only ADT SQL
tool:

```bash
python -c "import requests; r=requests.post('http://127.0.0.1:8787/tool/adt_sql', json={'query':\"SELECT COMPONENT, RELEASE, EXTRELEASE FROM CVERS WHERE COMPONENT = 'SAP_BASIS'\", 'max_rows':10}); print(r.json())"
```

Take the `RELEASE` value for `SAP_BASIS` (e.g. `758` → ABAP 7.58, part of the
7.5x line). This is the release to match against the documentation.

If `SAP_BASIS` is not populated in `CVERS` for some reason, cross-check with:
```bash
python -c "import requests; r=requests.post('http://127.0.0.1:8787/tool/adt_sql', json={'query':'SELECT COMPONENT, RELEASE, EXTRELEASE FROM CVERS','max_rows':100}); print(r.json())"
```
and look for `S4CORE` (S/4HANA release) as a secondary signal if `SAP_BASIS`
itself is missing.

## Step 2 — Resolve the release-specific documentation entry point

1. Fetch the base SAP Help ABAP Keyword Documentation page the user has
   pointed us at (see "Reference links" below) using `agentic_fetch`.
2. On that page, locate the **release/version selector** (SAP Help portal
   pages for the ABAP Keyword Documentation expose a version picker, e.g.
   links or a dropdown enumerating available releases such as 7.54, 7.55,
   7.56, 7.57, 7.58, etc.).
3. Pick the entry that matches (or is the closest available to) the
   `SAP_BASIS` release found in Step 1. Only follow links that are **actually
   present on the fetched page** — never construct or guess a release-specific
   URL yourself (per the "no URL guessing" rule); always navigate via links
   discovered on the page.
4. If no exact release match exists (SAP Help typically retains only the last
   few releases), use the closest older release and say so explicitly in the
   answer (e.g. "no dedicated 7.58 page found, using the 7.57 documentation as
   the closest match").

## Step 3 — Query the resolved page for the actual detail needed

Use `agentic_fetch` with a specific prompt against the resolved release page
(or its sub-pages, e.g. a specific keyword's syntax page, release notes page,
or RAP/BOPF guidance page) to answer the concrete question — e.g. "is `LOOP
AT ... GROUP BY` supported in this release", "what changed for `RAISE
EXCEPTION` in this release's news", "what's the exact syntax for `NEW` in a
constructor expression".

## Step 4 — Report with the release actually used

Always state which ABAP/SAP_BASIS release the documentation answer was
sourced from, so the user can judge relevance, e.g.:

> Per SAP_BASIS 758 (ABAP 7.58) documentation: ...

## Reference links

| Purpose | URL |
|---|---|
| ABAP Keyword Documentation (latest, entry point) | `https://help.sap.com/doc/abapdocu_latest_index_htm/latest/en-US/ABENABAP.html` |
| ABAP Core Data Services (CDS) — general overview | `https://help.sap.com/doc/abapdocu_latest_index_htm/latest/en-US/ABENCDS.html` |
| CDS Annotations — general overview | `https://help.sap.com/doc/abapdocu_latest_index_htm/latest/en-US/ABENCDS_ANNOTATIONS.html` |
| CDS Annotations — Annotation Definition | `https://help.sap.com/doc/abapdocu_latest_index_htm/latest/en-US/ABENCDS_ANNO_DEFINITION.html` |
| ABAP Inline Declarations | `https://help.sap.com/doc/abapdocu_latest_index_htm/latest/en-US/ABENINLINE_DECLARATIONS.html` |
| ABAP Obsolete Language Elements | `https://help.sap.com/doc/abapdocu_latest_index_htm/latest/en-US/ABENABAP_OBSOLETE.html` |
| ABAP Program Flow Logic | `https://help.sap.com/doc/abapdocu_latest_index_htm/latest/en-US/ABENABAP_FLOW_LOGIC.html` |
| ABAP Accessing the Application Server | `https://help.sap.com/doc/abapdocu_latest_index_htm/latest/en-US/ABENABAP_APP_SERVER_ACCESS.html` |
| ABAP Database Access | `https://help.sap.com/doc/abapdocu_latest_index_htm/latest/en-US/ABENDB_ACCESS.html` |
| ABAP SQL | `https://help.sap.com/doc/abapdocu_latest_index_htm/latest/en-US/ABENABAP_SQL.html` |
| ABAP Managed Database Procedures (AMDP) | `https://help.sap.com/doc/abapdocu_latest_index_htm/latest/en-US/ABENAMDP.html` |
| Release-specific entry point(s) | _pending — to be added_ |
| RAP / Business Object guidance | _pending — to be added_ |
| Release notes / "what's new" per release | _pending — to be added_ |

Use these as the fixed **entry points** for their respective topics (CDS
overview, CDS annotations, annotation definitions, inline declarations,
obsolete language elements, program flow logic, application server access,
database access, ABAP SQL, AMDP). Each of these `latest` pages still needs
Step 2's release-selector resolution before being treated as authoritative
for the connected system's actual `SAP_BASIS` release — never assume "latest"
equals the connected system's release. The **ABAP Obsolete Language
Elements** page is the canonical cross-check for the guideline's §10
forbidden/obsolete keyword list — use it to confirm whether a flagged
statement is still obsolete/forbidden (or was reintroduced/changed) in the
connected system's release. The **ABAP Database Access** and **ABAP SQL**
pages are the canonical cross-check for guideline §4 (ABAP SQL & Database
Performance Rules) when a specific
SELECT/JOIN/FOR ALL ENTRIES syntax question arises.

## Guardrails

- This is a **read-only, informational** lookup — it never changes SAP or
  local code by itself; it only informs the review/generation output.
- Never fabricate a release-specific URL — only follow links found by
  fetching a page the user has pointed us at.
- If the release can't be determined (`CVERS` unavailable/empty) or the
  SAP Help page structure has changed and no matching release can be found,
  say so plainly instead of guessing.
