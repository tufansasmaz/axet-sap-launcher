---
step_id: scmon-activation
phase: data-collection
order: 20
kind: consultant
title: Activate SCMON (ABAP Call Monitor) on the source system
prerequisites:
  - basis-buy-in
blocks:
  - susg-aggregation
next:
  - susg-aggregation
sap_notes:
  - 2679723
  - 1828848
  - 3006056
  - 2657522
estimated_time: "15 min to activate; 12 months collection window"
---

# Activate SCMON (ABAP Call Monitor) on the source system

> **Why we do this:** SCMON records every ABAP execution unit that actually runs on the production system — dialog transactions, batch jobs, OData calls, RFCs, and URL requests. After 12 months this data reveals which custom objects are genuinely used, which have zero calls (candidates for deletion), and which only run at specific times of year (year-end jobs that a shorter window would miss). Without SCMON data, custom-code classification is guesswork.

## Prerequisites

- `basis-buy-in` complete: Basis team has approved activation, agreed activation date, and confirmed the Record Limit
- SAP Notes 2679723, 1828848, and 3006056 checked on the source system (see Notes section)
- Transaction `SCMON` access (authorization object `S_ADMI_FCD` value `SCMO`) confirmed for the activating user
- Agreed scheduled deactivation timestamp recorded in `PROJECT_PLAN.md`

## Steps

1. **Open SCMON on the source production system**

   Run transaction `SCMON` (on S/4HANA 2024/2025+). On older releases the alias `/SDF/SCMON` works identically.

   The initial screen shows:
   - **Status** panel: whether SCMON is currently active or inactive
   - **Configure** button: opens the configuration dialog
   - **Activate** / **Deactivate** toggle button
   - **Display Data** button: opens the collected call records

   WHY: The status panel is the first thing to check — on some systems SCMON may already be active from a previous project or performance investigation.

2. **Check current status**

   Read the **Status** panel:
   - "Not active" — proceed to Step 3
   - "Active since <date>" — SCMON is already running. Check if the collection covers sufficient history. If active less than 12 months, note the activation date in PROJECT_PLAN.md and proceed to `susg-aggregation`.
   - "Deactivated (Record Limit reached)" — means the Record Limit was too low. Increase it (Step 3) and reactivate.

3. **Configure before activating**

   Click **Configure**. The configuration dialog has two fields:
   - **Scheduled Deactivation**: enter the agreed deactivation timestamp (activation date + 13 months). Format: `DD.MM.YYYY HH:MM:SS`. Example: if activating 2026-06-01, enter `01.07.2027 00:00:00`.
   - **Record Limit**: enter the agreed value. SAP default is sufficient for most landscapes; only raise it if the Basis team expects very high call volumes. Leave blank to use the system default.

   Click **Save** (or the tick icon).

   WHY: The Scheduled Deactivation prevents SCMON from running indefinitely on production. Without it, a new Basis admin could forget to stop it after the project ends.

4. **Activate SCMON**

   Click **Activate**. The system will:
   - Start the background collection job (visible in `SM37` as "ABAP Call Monitor: Collect" — KBA 2682315 confirms this job name)
   - Update the Status panel to "Active since <timestamp>"
   - Record the configuration in the SCMON tables

   WHY: Activation is system-wide — all application servers begin recording immediately. There is no per-server filter.

5. **Verify activation in SM37**

   Run `SM37`. Filter by job name `*SCMON*` or `*CALL MONITOR*`. Confirm a scheduled periodic background job exists and shows status "Scheduled" or "Active".

   If no job appears within 5 minutes of activation, SCMON may have silently failed. Check the SCMON status screen again and refer to Note 2679723 for troubleshooting.

6. **Record the activation in PROGRESS.md**

   Append a consultant progress row:
   - "SCMON activated on <SID>; deactivation scheduled <date>; Record Limit: <value>"

## Expected behaviour

- SCMON status shows "Active since <timestamp>"
- SM37 shows a recurring background job for the collection
- No ABAP dumps in SM21 following activation

## Common pitfalls

| Symptom | Likely cause | Fix |
|---|---|---|
| "Activate" button greyed out | Missing authorization `S_ADMI_FCD` `SCMO` | Assign correct auth; re-check with SU53 |
| Activation succeeds but SM37 shows no job | SAP_BASIS level below minimum | Apply Note 1828848 prerequisites; check Note 3006056 for corrections |
| "Record Limit reached" status after a few weeks | Record Limit set too low | Configure a higher limit; reactivate |
| Performance degradation reported after activation | High call volume + low-spec server | Apply Note 2657522 profile parameter tuning; involve Basis |
| SCMON shows active but SUSG shows no data | SUSG aggregation not yet run | Normal — proceed to `susg-aggregation` to schedule the daily job |

## When to come back

SCMON requires minimal attention after activation. Return here if:
- Status shows "Deactivated (Record Limit reached)" — increase limit and reactivate
- Basis reports the job is not running after a system copy or kernel upgrade
- After the 12-month collection window: verify status before running SUSG snapshot

## Output for the next step

- SCMON activation timestamp (feeds `susg-aggregation` — needed to set aggregation date range)
- Confirmed SM37 job name (for monitoring in subsequent sessions)
- Record Limit value (for `PROJECT_PLAN.md`)

## References

- SAP Note 2679723 — ABAP Call Monitor (central reference; start here for all SCMON issues)
- SAP Note 1828848 — UPL/SCMON technical prerequisites
- SAP Note 3006056 (KBA) — Corrections to UPL/SCMON prerequisites
- SAP Note 2657522 — Profile parameter tuning for SCMON/UPL overhead
- KBA 2682315 — SCMON collection background job
- [SAP Community — SCMON Setup and Execution Guide](https://community.sap.com/t5/abap-blog-posts/scmon-setup-and-execution-guide/ba-p/14363378)
- [saptechnicalguru.com — SCMON walkthrough](https://www.saptechnicalguru.com/system-usage-scmon-abap-call-monitor/)
