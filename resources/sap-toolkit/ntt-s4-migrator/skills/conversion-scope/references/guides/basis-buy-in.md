---
step_id: basis-buy-in
phase: setup
order: 11
kind: consultant
title: Secure Basis team buy-in and schedule monitoring window
prerequisites: []
blocks:
  - scmon-activation
  - atc-run-execute
next:
  - s-user-access-check
  - scmon-activation
sap_notes:
  - 2679723
  - 1828848
  - 2657522
estimated_time: "1 workshop (2 h) + follow-up email; calendar scheduling varies"
---

# Secure Basis team buy-in and schedule monitoring window

> **Why we do this:** SCMON activation is system-wide and requires sysadmin access. The Basis team owns system health, and running call-monitor collection for 12 months on production without their sign-off creates change-management and support risk. An upfront conversation aligns expectations, secures the right access, and prevents the monitoring from being disabled mid-collection by a Basis admin who doesn't know what it is.

## Prerequisites

- Initial project kick-off with the customer complete
- Identified Basis team lead and production system admin contact
- NTT project manager has confirmed project start date and go-live target

## Steps

1. **Brief the Basis team lead**

   Schedule a 2-hour working session. Cover:
   - What SCMON is and why it runs for 12 months (SAP recommendation to catch year-end / quarter-end jobs — see Note **2679723**)
   - Performance overhead: SAP states overhead is "about the same as UPL" (Note **2657522** covers the profile parameter if tuning is needed). No hard percentage is published; reassure that it is comparable to existing UPL if already active
   - System-wide activation: there is no per-server filter or sample rate. Full capture is the only mode, bounded by the Record Limit setting
   - The collection stops automatically at the **Scheduled Deactivation** date set during activation

   WHY: Basis admins are responsible for production performance. Presenting facts (not promises) builds trust and prevents surprises.

2. **Agree on the activation window and deactivation date**

   Agree on:
   - **Activation date**: prefer first week of a new month so the SUSG monthly aggregation captures a complete month from the start
   - **Scheduled deactivation date**: activation date + 13 months (12 months capture + 1 month buffer for aggregation to complete)
   - **Record Limit**: default is sufficient for most landscapes; only increase if the Basis team reports early stops (visible in SCMON status). If they want a conservative limit, Note **1828848** describes the underlying UPL/SCMON technical parameters

   Document the agreed dates in `./migration/PROJECT_PLAN.md`.

3. **Confirm admin access for the activation step**

   The consultant (or the Basis admin, if preferred) will need:
   - `SCMON` transaction access (authorization object `S_ADMI_FCD` with value `SCMO`)
   - Ability to schedule background jobs in `SM37`

   If the customer's Basis policy requires them to run `SCMON` activation themselves, get a commitment that they will do it on the agreed date and confirm via PROGRESS log.

4. **Set a calendar reminder for the data-collection milestone**

   - Add a calendar reminder at activation date + 12 months: "SUSG snapshot ready — start CCM app export"
   - Share the reminder with the Basis team lead so they know when monitoring can be safely deactivated

5. **Document the contact and access plan**

   Record in `PROJECT_PLAN.md`:
   - Basis contact name and email
   - Agreed SCMON activation date
   - Agreed deactivation date (= scheduled auto-stop timestamp)
   - Who will run SCMON activation (consultant vs Basis admin)
   - Record Limit agreed

## Expected behaviour

- Meeting notes / email confirmation that Basis approves SCMON activation
- `PROJECT_PLAN.md` updated with dates and contact
- PROGRESS.md row: "Basis buy-in obtained; SCMON activation scheduled for <date>"

## Common pitfalls

| Symptom | Likely cause | Fix |
|---|---|---|
| Basis admin disables SCMON mid-collection | No advance notice given | Repeat briefing; add Basis lead to PROGRESS distribution |
| Basis team refuses activation on production | Fear of performance impact | Share Note 2657522 parameter doc; offer to activate on quality/test system as proof-of-concept first |
| Activation delayed by change-management freeze | Production freeze window | Adjust activation date to next available change window; document in PROJECT_PLAN.md |
| Consultant forgot to set deactivation date | No scheduled stop configured | Production runs with SCMON indefinitely — resource waste. Fix in `atc-run-execute` by verifying deactivation date is set |

## When to come back

Return here if:
- The Basis team changes (new admin needs to be briefed)
- Customer environment changes (e.g. system refresh, hardware migration) require a new activation decision

## Output for the next step

- Agreed SCMON activation date (feeds `scmon-activation` timing)
- Basis contact with S-user credentials scope (feeds `s-user-access-check`)
- Record Limit decision (feeds `scmon-activation` configuration dialog)

## References

- SAP Note 2679723 — ABAP Call Monitor (SCMON) central reference Note
- SAP Note 1828848 — UPL/SCMON technical prerequisites
- SAP Note 2657522 — SCMON/UPL profile parameter tuning
- [SAP Community — SCMON Setup and Execution Guide](https://community.sap.com/t5/abap-blog-posts/scmon-setup-and-execution-guide/ba-p/14363378)
- [saptechnicalguru.com — SCMON walkthrough](https://www.saptechnicalguru.com/system-usage-scmon-abap-call-monitor/)
