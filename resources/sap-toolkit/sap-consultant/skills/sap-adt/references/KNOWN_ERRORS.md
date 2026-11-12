# ADT errors seen elsewhere — symptom, meaning, what to do

Field reports from another team's ADT tooling (Ozgur Yilmaz's axet-template, MIT —
`skills-sap/sap-adt-foundation/references/known-errors-adt.md`). Each was measured on
their systems, **not re-measured on ours**; what this engine itself does is in SKILL.md. Use these to read a symptom, never to argue
with what the tool or SAP actually returned.

| Symptom | What it usually means | Do |
|---|---|---|
| `412 PreconditionFailed` on a push | wrong ETag. With a pending inactive version (first push of a shell, or a retry after a failed activation) the ETag comes from the unversioned GET; `?version=active` gives a stale one | check `adt_inactive_objects`; report, do not resend blindly. `423` is a different cause (a dead lock handle) |
| `423 … not locked (invalid lock handle)` on a class although E071 shows it in the request | an earlier PUT variant burned the handle; the request is fine | one fresh lock → PUT once → unlock → activate separately |
| `NoModification` in a lock response | present on healthy classes too; it means nothing | never decide on it |
| `EU 510` | an editor lock — often an SE24/SE80 window the consultant opened and left | ask them to close it, then check SM12; tell them "open, do, **close**" |
| "activated" but the change is not live | `version="active"` metadata says active even for an empty shell; the unversioned GET returns the INACTIVE source | prove it: the object is gone from `adt_inactive_objects` **and** the active source matches what was pushed |
| `REPORT/PROGRAM statement is missing, or the program type is INCLUDE` | the include was created through the program endpoint, or it hangs off a standard exit and only compiles in its main program | recreate as an include; or activate it through the main program (a standard object — with approval) |
| `Include not found` | the main program was activated without its includes | activate includes and main program in ONE request |
| FM: `declares no type` / `FL 387 … is not a table type` | `STRUCTURE` typing, or a `TABLES` parameter typed with a structure | `TYPE <table type>` |
| FM: `Parameter comment blocks are not allowed` | the signature was sent as a `*"` comment block | write the signature inline |
| Z object created with master language EN | the logon language decides, not the create body; a name once created in EN and deleted can come back EN | read `masterLanguage` after every create; language cannot change in place — delete and recreate (test with another name first) |
| changing a description returns `412` and the object turns inactive | the description PUT rewrites the object envelope | activate afterwards and read the active version back |
| `ResourceScanDuringSaveFailure`, no line number | one construct in the change breaks the save scan (seen: `TYPE c LENGTH n` in a method signature; an orphan ABAP Doc comment = `OO_SOURCE_BASED 012`) | bisect: reset to the active source, add changes one at a time, push and diff after each |
| `TEXT-xxx cannot be modified` | text symbols cannot be assigned in source | use variables set in `INITIALIZATION` |
| transport list says 0 | not proof of no transport | check `E070` / `E071` with `adt_sql` before anyone opens a new request |
| object "does not exist" | an include asked as a program, a function module asked without its group, or a network error | ask with the right type / `adt_search`, cross-check `TADIR` / `TRDIR` before recreating anything |
| `401` after the password was fixed | a long-running server read the old credentials at start | restart the server; never retry logon to "see" (account lock) |
| a deleted object in the inactive list | the list includes objects with `TADIR-DELFLAG = 'X'` | cross-check `TADIR` |
| syntax check reports an error, activation succeeds | known for CDS/class interplay and SADL-generated types | cross-check by activation or in SAP GUI; "not measured" is neither "invalid" nor "valid" |
| "when did this object change" from `E070-AS4DATE` | that is the request's date, not the object's | use `adt_revisions` |
| a classrun returned non-200 or timed out | it may still have run (mail sent, rows written) | check SOST / the tables / ST22 before running it again |
| a standard data element's Turkish label | the tools return the master-language text | read `DD04T` (`DD07T` for domain texts) with `ddlanguage = 'T'`; no row = no Turkish text |

**Before blaming the tool:** compare with an object of the same type that is known to
work; "0 results" is not "none" until a query that must find something does; measure
before and after a change, not only after.
