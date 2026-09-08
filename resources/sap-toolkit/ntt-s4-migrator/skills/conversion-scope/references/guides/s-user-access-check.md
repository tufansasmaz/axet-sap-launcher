---
step_id: s-user-access-check
phase: setup
order: 12
kind: consultant
title: Verify S-user access and software-download authorisation
prerequisites: []
blocks:
  - ccmsidb-download
  - note-download-batch
next:
  - ccmsidb-download
  - atc-check-variant-install
sap_notes:
  - 3548772
  - 2672703
estimated_time: "30–60 min (account verification + auth request if needed)"
---

# Verify S-user access and software-download authorisation

> **Why we do this:** Downloading the Simplification Database (CCMSIDB) ZIP, SAP Notes, and ATC check variant transports all require an S-user account with software-download authorisation on `me.sap.com`. The plugin cannot perform these downloads on your behalf — they require authenticated browser sessions. Verifying access at the start of the engagement prevents a hard blocker the day you need to run an ATC analysis.

## Prerequisites

- S-user account details (provided by the customer's SAP contract administrator or NTT delivery lead)
- Access to `https://me.sap.com/` from the consultant's laptop

## Steps

1. **Log in to SAP for Me**

   Navigate to `https://me.sap.com/` and log in with the S-user credentials.

   WHY: Verifies the account is active and not locked. S-user accounts can lapse or require periodic password resets under the customer's SAP contract policy.

2. **Verify software-download authorisation**

   In SAP for Me, navigate to: *My Profile* → *Software* (or *Authorization Roles*).

   Look for the role **"Software Download"** (sometimes listed as "SW Download"). If it is absent:
   - Raise a request to the customer's SAP contract administrator (the S-user "Super Admin")
   - Authorisation can take 1–5 business days
   - Document the request date in `./migration/PROJECT_PLAN.md`

   WHY: Without software-download rights, the CCMSIDB ZIP download fails with an authentication error. This is a known blocker that should be resolved before the ATC run date.

3. **Verify access to Software Download Center**

   In SAP for Me, go to: *Software* → *Download Software* (or navigate to *Software Download Center*).
   - Attempt to browse to the section for "Support Packages and Patches"
   - You should see a searchable catalogue without errors

   If you see "You are not authorised to download software", authorisation is missing — return to Step 2.

4. **Confirm the RFC user authorisations on the central check system**

   The RFC user used for remote ATC (configured in `central-atc-setup`) needs the authorisation profile described in SAP Note **3548772** (consolidated auth Note). Verify:

   On the central check system, run `SU53` (or `SU01` for the RFC user) to confirm:
   - Authorization object `S_RFC` for the ATC RFC destination
   - Authorization object `S_DEVELOP` with activity `02` (for ATC result write)
   - Full profile per Note 3548772 (it supersedes the older Note **2672703** for most landscapes)

   WHY: Missing RFC user auth causes the remote ATC run to fail mid-execution with ABAP short dumps or empty result sets — hard to diagnose after the fact.

5. **Document the S-user and access status**

   Record in `PROJECT_PLAN.md`:
   - S-user ID used for downloads
   - Software-download authorisation: confirmed / pending (date)
   - RFC user SID and client on central check system
   - Auth check result (OK / items to fix)

## Expected behaviour

- Successful login to `me.sap.com/`
- Software Download Center loads without authorisation error
- RFC user auth check in SU53 shows no missing objects (or a clear list of what needs to be fixed)

## Common pitfalls

| Symptom | Likely cause | Fix |
|---|---|---|
| "Not authorised to download software" on me.sap.com | Software-download role missing | Request from SAP contract admin; allow 1–5 business days |
| S-user login fails | Account inactive or password expired | Reset via SAP for Me self-service or contact SAP Support |
| SU53 shows S_RFC missing | RFC user not assigned correct role | Assign role per Note 3548772; test again with /SATC/RFC_TEST report |
| CCMSIDB download blocked by proxy | Corporate proxy blocks me.sap.com | Use a VPN or get proxy exception; document for the team |

## When to come back

Return here if:
- The S-user password changes
- A new download is needed (e.g. updated CCMSIDB patch)
- The RFC user is deleted or its auth profile is revoked during system refresh

## Output for the next step

- S-user confirmed with software-download rights (unblocks `ccmsidb-download` and `note-download-batch`)
- RFC user auth verified (unblocks `atc-run-execute`)
- Any pending auth requests documented with expected resolution date

## References

- SAP Note 3548772 — Consolidated authorisation Note for ATC remote analysis
- SAP Note 2672703 — RFC user authorisations (older; see 3548772 for current guidance)
- [SAP for Me Software Download Center](https://me.sap.com/softwarecenter)
- [Custom Code Migration Guide 2025.001 (PDF)](https://help.sap.com/doc/9dcbc5e47ba54a5cbb509afaa49dd5a1/2025.001/en-US/CustomCodeMigration_EndtoEnd.pdf)
