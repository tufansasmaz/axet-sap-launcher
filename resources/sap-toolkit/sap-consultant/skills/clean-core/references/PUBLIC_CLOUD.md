# Writing for S/4HANA Cloud Public Edition (profile `public`)

A project whose brief says `clean_core: public` is not a stricter Private Cloud. The
platform has no SAP GUI, no classic ABAP and no way to touch SAP's code, and SAP upgrades
it on its own calendar. A document written the on-premise way — a report with a selection
screen, an ALV, a user exit, a transport through STMS — describes a build nobody can
make there. Before 2026-10-01 the only guard was one clause ("no Level 4 on Public
Cloud") and the rest of the TS kept its on-premise shape.

This file says what replaces what. Where it names an API or object, **the checker's
answer wins**: run `clean_core_checker.py <names> --profile public --json` and use only
what comes back `free`. An object the repository has no entry for is `blocked`, not
"probably fine".

## Order of the solution (FS and TS)

1. **Standard first (fit-to-standard).** Which scope item and which configuration covers
   the requirement? A requirement the standard meets is configuration, not development —
   say so and stop.
2. **Key user extensibility** — custom fields, custom logic, custom CDS views, custom
   business objects, form and e-mail templates, UI adaptation. No ABAP project, done in
   Fiori apps by a key user.
3. **Developer extensibility** — ABAP Cloud in ADT on the development tenant: RAP business
   objects, CDS view entities, classes, released BAdI implementations, own tables,
   application jobs.
4. **Side-by-side on BTP** — CAP or ABAP environment, Integration Suite, Build — when the
   logic or the UI does not belong in the core.
5. **None of these fits** → the requirement is an open item for the customer (change the
   process, or take it out of scope). It is never solved with a classic technique.

## What does not exist, and what stands in its place

| On-premise habit | Public Cloud |
|---|---|
| Report (`REPORT`, SE38), selection screen | RAP service + Fiori elements app; a mass run is an **application job** |
| Classic ALV, Dynpro, GUI status, popup | Fiori elements list report / object page; UI adaptation |
| Transaction code | Fiori app with a tile, through an IAM app and a business catalog |
| `SELECT` from an SAP table (`MARA`, `EKKO`, `VBAK` …) | the **released CDS view** the checker names as successor |
| Classic BAPI, non-released function module | released RAP BO interface (EML) or released API; integration through a released OData/SOAP API |
| User exit, customer exit, classic BAdI, enhancement spot | **released** BAdI (developer extensibility) or Custom Logic (key user) |
| Modification, implicit enhancement, repair | does not exist |
| Append structure, CI include | Custom Fields app; a released extension include where SAP offers one |
| SAPscript, Smart Forms, own print program | form templates in output management |
| Background job (SM36), `SUBMIT` | application job: job catalog entry + job template |
| Application log through `BAL_*` | the released application-log API |
| Number range through `NUMBER_GET_NEXT` | the released number-range API |
| Authorization object + PFCG role | authorization object in ADT → IAM app → business catalog → business role |
| RFC destination (SM59), IDoc port | communication scenario, communication system, communication arrangement, communication user |
| File on the application server (`OPEN DATASET`) | not available; a file arrives through an API or an integration flow |
| STMS transport route | transport request released in ADT, imported with the transport apps; key-user items through a software collection |
| Catalog tables read with SQL (`DD02L`, `TADIR` …) | not readable; existence is checked in ADT, release in the checker |

## What this changes in a TS

- **§1.3 Clean Core.** State the profile. The decision table has levels 1–3 and no row
  for level 4. Every standard object is in the evidence column as `Released`, or the
  design does not use it.
- **§2.1 Object list.** Only object types the platform has: CDS view entity, behavior
  definition and implementation, service definition and binding, class, interface, table,
  data element, domain, released-BAdI implementation, application job catalog entry and
  template, IAM app, business catalog, communication scenario — plus the key-user items
  (custom field, custom logic, custom CDS view, custom business object), which are listed
  as configuration, not as ABAP objects, and carry the `YY1_` prefix the platform gives
  them. Add a column: **Uzantı türü** (key user / developer / side-by-side).
- **§2.3–2.6 Input, output, UI.** No selection screen and no ALV field catalogue. The
  screen is a Fiori app: filter bar fields, table columns, object page sections, actions.
  The pictures rule holds — draw the Fiori screen with `screen-mockup`.
- **§2.5a Enhancement.** The BAdI is named with its release status from the checker, and
  whether it is implemented in ADT or in Custom Logic.
- **§2.8 Error handling.** Exception classes and RAP messages (`REPORTED` / `FAILED`);
  no `MESSAGE` statement to a screen.
- **§2.10 Authorization.** Authorization object, IAM app, business catalog, the business
  role template it belongs in; restriction types where a field is restricted.
- **§2.13 Transport & deployment.** The tenants from the brief (development, test,
  production; the starter system is not a target), the software component, and which
  items travel in a transport request and which in a software collection.
- **System verification (STEP 5a) does not run.** Its catalog queries are not possible
  on this platform. Write one sentence saying so; the release check is the verification.
- **Naming.** `NAMING_STANDARD.md` §4 (CDS, RAP) and §5.1 (Public Cloud objects). The
  classic formulas in §3 — report, include, function group, Dynpro — are not used.
- **Not applicable:** the Adobe-form and Dynpro generator notes, include role suffixes,
  the ABAP language-version note (everything is ABAP Cloud).

## What this changes in an FS

- The solution section answers step 1 first: the scope item and configuration that cover
  the requirement, or the sentence *"standart karşılamıyor"* with the reason.
- A proposal is tagged with its route (`[Öneri — key user]`, `[Öneri — developer]`,
  `[Öneri — side-by-side]`). No proposal names a classic technique.
- Screens are Fiori apps; reports are list reports, analytical queries or application
  jobs.

## What this changes in a code review or quality gate

- Any object the checker does not return `free` is a blocker, and so is any statement
  ABAP Cloud does not have (`CALL TRANSACTION`, `SUBMIT`, `WRITE`, `MESSAGE` to a screen,
  Dynpro statements, `OPEN DATASET`, native SQL).
- The language version of every object is ABAP for Cloud Development. An object in
  another language version is a finding by itself.

## What stays the same

The gap list, traceability from requirement to object to test, complete message texts,
numbered pseudocode, the naming standard for what it covers, the self-check, the review
briefing and the approval step.
