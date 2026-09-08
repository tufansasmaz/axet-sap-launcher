---
step_id: ccmsidb-download
phase: data-collection
order: 22
kind: consultant
title: Download and import the Simplification Database (CCMSIDB)
prerequisites:
  - s-user-access-check
blocks:
  - atc-check-variant-install
  - atc-run-execute
next:
  - atc-check-variant-install
sap_notes:
  - 2241080
  - 3693326
estimated_time: "30–60 min (download + import + verify)"
---

# Download and import the Simplification Database (CCMSIDB)

> **Why we do this:** The Simplification Database is SAP's catalogue of every object, transaction, and API that changes or disappears in S/4HANA — each entry cross-referenced with a SAP Note and a remediation hint. The ATC check variant `S4HANA_READINESS_*` uses it to map findings to business impact and effort. Without an up-to-date CCMSIDB the ATC checks produce findings with no context — you cannot prioritise or estimate effort from them alone.

## Prerequisites

- `s-user-access-check` complete: S-user with software-download authorisation confirmed
- `SYCM` transaction access on the central check system (or on the system where you will import the DB)
- ZIP file will be placed in `./migration/inputs/ccmsidb/` on the consultant's laptop

## Steps

1. **Download the latest CCMSIDB patch**

   Navigate to `https://me.sap.com/softwarecenter` (SAP for Me Software Download Center). The legacy `support.sap.com/swdc` URL still redirects to this page.

   Search for: **"Simplification Database"** or use the Note reference **2241080** which defines the package.

   Download the latest patch. Patches are released **irregularly** with no public schedule — always re-download before each ATC run to ensure you have current content. The patch is cumulative and target-release-aware; one ZIP covers S/4HANA 1909 through 2025. Save it to `./migration/inputs/ccmsidb/CCMSIDB.zip`.

   WHY: Content changes with each patch. A stale CCMSIDB means the ATC variant checks against outdated simplification item definitions — findings may be under- or over-reported relative to the actual S/4HANA target release.

2. **Note the version and patch level**

   Before importing, note the filename and any version information visible in the download portal. Record in `PROJECT_PLAN.md`: CCMSIDB patch level + download date.

   WHY: When the CCMSIDB is re-downloaded mid-project (e.g. a new patch released), this record lets you compare results between runs.

3. **Import via transaction SYCM**

   On the **central check system** (or any system running S4HANA_READINESS checks):

   Run transaction `SYCM` → navigate to **Simplification Database** → **Import from ZIP File**.

   - Click **Browse** and select the CCMSIDB.zip from your local filesystem (or a network share the SAP GUI can access)
   - Click **Import** / **Execute**

   The import may take several minutes depending on the patch size. A progress bar or spool output will appear.

   **Fallback path**: If the SYCM menu import is unavailable (older release), run `SE38` → report `SYCM_UPLOAD_SIMPLIFIC_INFO`. This report is present in S/4HANA 2024/2025 and is the historical import route.

   WHY: The import populates the SYCM internal tables so the ATC check variant can look up simplification items at run time.

4. **Verify the import**

   After import completes, run `SYCM` → **Simplification Database** → **Display Content**.

   You should see:
   - Records loaded > 0 (typically thousands of rows for a full patch)
   - Version/patch level shown in the header
   - Items browsable by SAP Object Type, Object Name, Simplification Category

   If records = 0, the import silently failed. Re-run Step 3 and check spool output for errors.

   WHY: A confirmed non-zero record count proves the CCMSIDB is available for ATC check resolution. This is your go/no-go gate before running the ATC check variant.

5. **Record the import in PROGRESS.md**

   Append: "CCMSIDB patch <level> imported to <SID>; records loaded: <count>; download date: <date>"

## Expected behaviour

- SYCM → Display Content shows records > 0 with correct patch level
- Import completes without ABAP dump in SM21
- CCMSIDB.zip in `./migration/inputs/ccmsidb/`

## Common pitfalls

| Symptom | Likely cause | Fix |
|---|---|---|
| "You are not authorised to download software" on me.sap.com | Software-download role missing | Return to `s-user-access-check`; request role assignment |
| SYCM import stalls at 0% | SAP GUI file-transfer size limit | Use a network share path instead of local file upload |
| Records = 0 after import | Wrong ZIP (e.g. downloaded wrong product) | Re-download; verify the product is "Simplification Database" under Note 2241080 |
| "Unknown XML element" in SYCM import log | Possible new XML schema version | Document as schema-discovery lesson; check Note 3693326 for workaround |
| SYCM menu unavailable | Older ABAP basis release | Use fallback `SE38` → `SYCM_UPLOAD_SIMPLIFIC_INFO` |

## When to come back

Return here when:
- A new CCMSIDB patch is released and you want to refresh before a re-run
- Migrating the central check system to a new SID
- ATC findings show "simplification item not found" errors

## Output for the next step

- CCMSIDB imported and verified on the central check system
- Patch level and record count recorded in `PROJECT_PLAN.md`
- CCMSIDB.zip stored in `./migration/inputs/ccmsidb/` (plugin's required input)

## References

- SAP Note 2241080 — Simplification Database package definition
- KBA 3693326 — Download and import procedure for the Simplification Database
- [help.sap.com — Importing the Simplification Database as a ZIP File](https://help.sap.com/docs/ABAP_PLATFORM_BW4HANA/7bfe8cdcfbb040dcb6702dada8c3e2f0/349d954ade3048bab1ee408ba0da5c83.html)
- [help.sap.com — Displaying the Content of the Simplification Database](https://help.sap.com/docs/ABAP_PLATFORM_BW4HANA/7bfe8cdcfbb040dcb6702dada8c3e2f0/39ac9e9ec7164040b1bcde1d09e00730.html)
- [SAP-samples/abap-platform-ccm-workshops (exercise 2)](https://github.com/SAP-samples/abap-platform-ccm-workshops/blob/main/exercises/ex2/README2.md)
- [Custom Code Migration Guide for SAP S/4HANA 2025 (PDF)](https://help.sap.com/doc/9dcbc5e47ba54a5cbb509afaa49dd5a1/2025.001/en-US/CustomCodeMigration_EndtoEnd.pdf)
