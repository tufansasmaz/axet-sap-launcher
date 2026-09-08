---
step_id: atc-check-variant-install
phase: data-collection
order: 23
kind: consultant
title: Install the S/4HANA readiness ATC check variant
prerequisites:
  - central-atc-setup
  - ccmsidb-download
blocks:
  - atc-run-execute
next:
  - atc-run-execute
sap_notes:
  - 3666462
  - 2364916
  - 3492056
estimated_time: "30–60 min (Note download + transport import + activation)"
---

# Install the S/4HANA readiness ATC check variant

> **Why we do this:** The ATC check variant `S4HANA_READINESS_2025` (or the matching variant for your target release) is the set of check definitions that knows how to compare your custom code against S/4HANA's changed APIs, removed transactions, and mandatory structural requirements. It is not shipped with the base SAP_BASIS installation — it arrives as a transport via a SAP Note. Without the correct variant installed, the ATC run uses generic code-quality checks rather than the migration-specific rules.

## Prerequisites

- `central-atc-setup` complete: ATC central check system configured and RFC connectivity verified
- `ccmsidb-download` complete: Simplification Database imported (ATC variant checks reference it at run time)
- Transport Management available on the central check system
- S-user with software-download rights (to download the Note transport)

## Steps

1. **Identify the correct check variant Note for your target release**

   Use the mapping below. If your target is not listed, consult SAP Note 2364916 for the current variant catalogue:

   | Target release | Check variant name | Delivering Note |
   |---|---|---|
   | S/4HANA 2025 (with FLE) | `S4HANA_READINESS_2025` | **3666462** |
   | S/4HANA 2025 (no FLE) | `S4HANA_READINESS_2025_NO_FLE` | **3666462** |
   | S/4HANA 2024 | `S4HANA_READINESS_2024` | TBD per customer landscape |
   | S/4HANA 2023 | `S4HANA_READINESS_2023` | TBD per customer landscape |
   | Any target (remote, release set in RFC config) | `S4HANA_READINESS_REMOTE` | Shipped in base ATC |

   FLE = Field-Length Extension. Use `_NO_FLE` when the customer is NOT opting into extended material number (40 chars) or extended amount/stock/season fields.

2. **Download Note 3666462 transport files**

   Navigate to `https://me.sap.com/softwarecenter` → search for "Support Package" or directly look up SAP Note **3666462** in the SAP Support Portal.

   Download the transport files attached to the Note (typically one or two .SAR or .zip files containing data and cofiles).

   WHY: SAP check variants are delivered as ABAP transports, not as part of the base installation. The Note is the delivery vehicle.

3. **Import the transport on the central check system**

   On the **central check system**, run `STMS` → *Import Queue* → upload the transport files and import them.

   Alternatively, ask the Basis admin to copy the transport files to the transport inbox directory and import via STMS.

   After import completes, the variant name `S4HANA_READINESS_2025` (and `_NO_FLE`) should appear in the ATC check variant list.

4. **Verify the variant is available in ATC**

   Run `ATC` → *Configuration* → *Check Variants*. You should see `S4HANA_READINESS_2025` in the list.

   Select it → *Display*. The variant should reference the CCMSIDB and include check categories for:
   - Simplification Item checks (Prio 1/2/3)
   - Custom Code Migration checks
   - Field-Length Extension checks (if the FLE variant)

5. **Handle a deleted variant (rescue path)**

   If the variant was accidentally deleted (e.g. after a system copy), KBA **3492056** provides the rescue procedure for `S4HANA_READINESS_2023_NO_FLE`. The same approach applies to other variants: re-import the delivering Note's transport.

6. **Document the installed variant in PROJECT_PLAN.md**

   Record: variant name, FLE selection, delivering Note number, import date.

## Expected behaviour

- `ATC` → Check Variants shows `S4HANA_READINESS_2025` (and optionally `_NO_FLE`) in the list
- Variant detail view shows check categories linked to CCMSIDB content
- STMS import log shows no errors

## Common pitfalls

| Symptom | Likely cause | Fix |
|---|---|---|
| Variant not in ATC list after import | Transport not fully imported | Check STMS import log; re-import |
| "Simplification items not found" during ATC run | CCMSIDB not imported or outdated | Return to `ccmsidb-download`; re-import latest patch |
| FLE variant causes false positives | Customer not opted in to FLE | Switch to `_NO_FLE` variant; document in PROJECT_PLAN.md |
| Note 3666462 transport fails import | SAP_BASIS level below minimum | Check Note prerequisites; apply prerequisite Notes first |
| Variant accidentally deleted | System copy or manual deletion | Follow KBA 3492056 rescue procedure |

## When to come back

Return here when:
- Target release changes (e.g. scoping changed from 2024 to 2025)
- A new patch of the check variant Note is released mid-project
- System refresh resets the transport queue

## Output for the next step

- Check variant name confirmed (feeds `atc-run-execute` — variant selection field)
- FLE decision documented (feeds `atc-run-execute` + `PROJECT_PLAN.md`)
- Central check system is ready to run ATC with S/4HANA readiness checks

## References

- SAP Note 3666462 — Check Variant for SAP S/4HANA 2025 Custom Code Checks (with manual post-implementation steps)
- SAP Note 2364916 — Recommended SAP Notes for ATC remote analysis (variant catalogue entry point)
- KBA 3492056 — Rescue procedure for deleted `S4HANA_READINESS_2023_NO_FLE` variant
- [GitHub — SAP/abap-atc-cr-cv-s4hc](https://github.com/SAP/abap-atc-cr-cv-s4hc)
- [Remote ATC for S/4HANA readiness — saptechnicalguru.com](https://www.saptechnicalguru.com/remote-atc-s4hanareadiness/)
- [Custom Code Migration Guide for SAP S/4HANA 2025 (PDF)](https://help.sap.com/doc/9dcbc5e47ba54a5cbb509afaa49dd5a1/2025.001/en-US/CustomCodeMigration_EndtoEnd.pdf)
