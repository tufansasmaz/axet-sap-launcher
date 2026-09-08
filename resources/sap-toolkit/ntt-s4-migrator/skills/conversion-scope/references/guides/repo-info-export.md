---
step_id: repo-info-export
phase: analysis
order: 32
kind: consultant
title: Run SYCM_DOWNLOAD_REPOSITORY_INFO to produce the custom-code repository ZIP
prerequisites:
  - ccmsidb-download
  - atc-check-variant-install
blocks:
  - readiness-check-upload
next:
  - readiness-check-upload
sap_notes:
  - 2185390
  - 2758146
  - 3533625
estimated_time: "30–90 min (background job on development system)"
---

# Run SYCM_DOWNLOAD_REPOSITORY_INFO to produce the custom-code repository ZIP

> **Why we do this:** The SAP Readiness Check dashboard's "Custom Code" tile requires two separate uploads: the ATC findings ZIP and the repository-info ZIP. The repository-info file provides the object inventory (which custom programs, classes, function modules, and includes exist) so the RC dashboard can show you counts and coverage even before the full ATC analysis. Running this report on the **development system** (not production) captures the authoritative object list for the custom namespaces in scope.

## Prerequisites

- `ccmsidb-download` complete: Simplification Database available (needed to contextualise the repository scan)
- SE38 execute access on the development system
- Custom namespace list confirmed in `PROJECT_PLAN.md` (Z*, Y*, /CUSTNS/* etc.)
- Background job scheduling permission in `SM37`

## Steps

1. **Open the SYCM_DOWNLOAD_REPOSITORY_INFO report**

   On the **development system** (not production — this report scans object repository), run:

   `SE38` → enter report name `SYCM_DOWNLOAD_REPOSITORY_INFO` → **Execute** (F8).

   Alternatively, if your system has a dedicated menu path in `SYCM`, navigate there.

   WHY: The development system holds the working copy of all custom objects. Production may have objects that were deployed but the dev system is the canonical object catalogue for migration scoping.

2. **Configure the report parameters**

   The report parameters (exact field names may vary by release — verify on your system):
   - **Package / Namespace filter**: enter the custom namespaces or packages from `PROJECT_PLAN.md`
   - **Target release**: select the S/4HANA target release (e.g. `S/4HANA 2025`)
   - **Output file destination**: select "Download to Frontend" or a configured AL11 path

   Leave advanced parameters at defaults unless Basis has specific guidance.

3. **Schedule as a background job**

   For large landscapes, this report can take 30–90 minutes. Schedule it as a background job:
   - `SE38` → `SYCM_DOWNLOAD_REPOSITORY_INFO` → *Execute in Background* (via program menu or F9 equivalent)
   - Set job name: `SYCM_REPOINFO_<SID>_<YYYYMM>`
   - Schedule immediately or at a convenient off-peak time

   Monitor in `SM37`.

4. **Download the output ZIP**

   After the background job completes, download the output. The recommended filename pattern is `S4HMigrationRepositoryInfo<SID>.zip` (KBA 3533625 confirms the RC dashboard uses this filename pattern for identification).

   **Do not rename the ZIP.** The RC dashboard uses the filename to route the upload to the correct tile.

   Save to `./migration/inputs/atc/` alongside the ATC findings ZIP.

5. **Verify the ZIP is non-empty**

   Unzip locally:
   - Should contain one or more XML files describing the object inventory
   - Object count should be plausible for the scope (hundreds to thousands of objects)

6. **Record in PROGRESS.md**

   Append: "Repository info ZIP generated; file: `S4HMigrationRepositoryInfo<SID>.zip`; job completed: <timestamp>"

## Expected behaviour

- Background job completes with status "Finished" in SM37
- ZIP file non-empty, containing object inventory XML(s)
- Filename follows `S4HMigrationRepositoryInfo<SID>.zip` convention

## Common pitfalls

| Symptom | Likely cause | Fix |
|---|---|---|
| Report not found in SE38 | SYCM package not installed or report name differs | Check SYCM transaction menu; Note 2185390 covers prerequisite packages |
| Background job terminates early | Memory / timeout | Increase background job resources; split by namespace if possible |
| RC dashboard rejects ZIP | Filename was changed | Re-download with correct filename pattern |
| Object count = 0 | Namespace filter excludes all objects | Verify filter against PROJECT_PLAN.md namespace list |
| Job runs >90 min | Very large custom codebase | Normal; wait; do not interrupt |

## When to come back

Return here when:
- A significant batch of new custom objects has been developed and the scope needs refreshing
- The RC dashboard shows stale object counts

## Output for the next step

- `./migration/inputs/atc/S4HMigrationRepositoryInfo<SID>.zip` — secondary input for RC dashboard upload
- Object inventory counts (for exec summary context)

## References

- SAP Note 2185390 — SAP Readiness Check central prerequisite Note
- SAP Note 2758146 — Readiness Check planning Note
- KBA 3533625 — ATC/repo-info upload to RC: filename rules
- [Custom Code Migration Guide for SAP S/4HANA 2025 (PDF)](https://help.sap.com/doc/9dcbc5e47ba54a5cbb509afaa49dd5a1/2025.001/en-US/CustomCodeMigration_EndtoEnd.pdf)
