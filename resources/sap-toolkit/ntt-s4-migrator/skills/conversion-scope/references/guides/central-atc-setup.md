---
step_id: central-atc-setup
phase: setup
order: 10
kind: consultant
title: Configure the central ATC check system
prerequisites: []
blocks:
  - atc-check-variant-install
  - atc-run-execute
next:
  - basis-buy-in
  - s-user-access-check
sap_notes:
  - 2364916
  - 2599695
  - 2190065
  - 2270689
  - 3548772
  - 3015497
estimated_time: "2–4 h (first-time setup); 30 min on a prepared landscape"
---

# Configure the central ATC check system

> **Why we do this:** The central ATC check system is the hub that receives remote code analysis from the production (or development) source landscape. Without it you cannot run the `S4HANA_READINESS_*` check variants across your custom-code base. Setting it up once allows every subsequent analysis run — and every future engagement on this customer — to reuse the same infrastructure.

## Prerequisites

- SAP Basis admin access to the designated central check system (typically a separate ABAP system, or BTP ABAP environment per Note 3015497)
- S-user with SAP Support Portal access to apply Notes
- RFC connectivity between the source system(s) and the central check system is routable
- Transport Management system available (for importing check variants later)

## Steps

1. **Apply prerequisite SAP Notes on the central check system**

   Run transaction `SNOTE` (Note Assistant) and apply:
   - **2364916** — *Recommended SAP Notes for using ATC to perform remote analysis*. This is the entry-point bundle; follow its dependencies.
   - **2599695** — *Custom Code Migration Fiori App: Remote Stubs*. Required if you plan to use the CCM Fiori app on this system.
   - **2190065** — *ATC/CI: Remote Code Analysis Object Provider Stub*. Enables the object provider for remote checks.
   - **2270689** — *RFC Extractor for static checks*. Required for RFC-based code delivery.
   - **3548772** — *Consolidated authorisation Note* for ATC remote analysis. Apply this as a one-stop auth setup (supersedes 2672703 for most landscapes).

   For BTP ABAP environments as central check systems, additionally apply **3015497**.

   WHY: These Notes install the stubs, RFCs, and auth objects that the source system's ATC client depends on. Missing any one of them causes the remote ATC run to fail silently or with misleading errors.

2. **Create an RFC destination from the source system to the central check system**

   On the **source system**, run `SM59` → *Create* → Connection type **3 (ABAP)**.
   - Logical system: name it `<SID>_ATC_CENTRAL` by convention
   - Host, system number, client: from Basis team
   - Logon/Security tab: dedicated RFC user (see `s-user-access-check` guide for auth profile)

   WHY: Without the RFC destination the source ATC client has no route to deliver findings to the central system.

3. **Configure the ATC object provider on the central system**

   On the **central system**, run `ATC` → *Infrastructure* → *Object Provider Configuration*.
   - Add a new provider for the source system's RFC destination
   - Set the target: the RFC destination created in Step 2 (in reverse — from central to source)
   - Activate

   WHY: This tells the central ATC server which source systems it can pull objects from for analysis.

4. **Verify connectivity**

   On the **central system**, run `ATC` → *Infrastructure* → *Remote Check Systems*.
   - Select your source system entry → *Test Connection*
   - Expected: "Connection OK" or green status

   If the test fails, check RFC gateway rules and firewall ACLs. Common cause: gateway not allowing the ATC port.

5. **Set the default check variant scope**

   On the **central system**, run `ATC` → *Configuration* → *Check Variant*.
   - Note the variants available (populated after `atc-check-variant-install` guide)
   - Set the default for this check system to `S4HANA_READINESS_REMOTE` as a placeholder until the release-specific variant is installed

## Expected behaviour

- SM59 connection test returns HTTP 200 or RFC OK
- `ATC` → Remote Check Systems shows source system as "Connected"
- `SNOTE` shows all applied Notes with green status (no pending pre-requisites)

## Common pitfalls

| Symptom | Likely cause | Fix |
|---|---|---|
| RFC test fails: "No route to host" | Firewall blocks port | Ask Basis to open the ATC RFC gateway port between systems |
| Object provider activation fails | Note 2190065 not applied | Apply Note; restart ICM if needed |
| "No check variants available" | Note 2364916 not yet applied | Apply Note bundle; reimport transport |
| BTP ABAP central system: "Stub not found" | Note 3015497 missing | Apply Note on BTP tenant |

## When to come back

This is a one-time setup per landscape. Return here only if:
- A new source system is added to the scope
- The central check system is replaced (e.g. moved to BTP ABAP)
- Auth errors appear during later ATC runs

## Output for the next step

- RFC destination name (for `s-user-access-check` and `atc-check-variant-install`)
- Confirmation that connectivity test passes
- Central check system SID (used in all subsequent guides)

## References

- SAP Note 2364916 — Recommended SAP Notes for remote ATC analysis
- SAP Note 2599695 — Custom Code Migration Fiori App: Remote Stubs
- SAP Note 2190065 — ATC/CI: Remote Code Analysis Object Provider Stub
- SAP Note 2270689 — RFC Extractor for static checks
- SAP Note 3548772 — Consolidated auth Note (one-stop auth setup)
- SAP Note 3015497 — Foundation Note for BTP ABAP environment as central check system
- [Custom Code Migration Guide 2025.001 (PDF)](https://help.sap.com/doc/9dcbc5e47ba54a5cbb509afaa49dd5a1/2025.001/en-US/CustomCodeMigration_EndtoEnd.pdf)
