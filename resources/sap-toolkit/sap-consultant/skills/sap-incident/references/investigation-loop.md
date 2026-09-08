# The investigation loop — concrete chains

These are opening moves, not a script. Run the loop from `SKILL.md` §3: pick the query that
best discriminates between the live hypotheses, run it, append the row, re-plan.

Every call that produces a finding gets a ledger row **as it happens**, not at the end.
Reconstructing evidence afterwards is how a case becomes fiction.

---

## Opening move on a regression: what changed here recently

Run it when the ticket says *"geçen hafta çalışıyordu"* — roughly seven in ten of them — and
it replaces 40 minutes of STMS/SCU3/SE16 archaeology done by hand. Run it **narrowed to the
objects that plausibly touch the symptom**, which means you need at least a guess at the
area first; a bare date-range dump of the transport log is noise, and on a busy system it is
a lot of noise.

| Question | Call |
|---|---|
| Which requests touching this area were released in the window | `adt_sql` → `E070` (TRKORR, TRSTATUS, AS4DATE) joined to `E071` on the object names — see the warning below |
| What configuration changed | `adt_sql` → `CDHDR` / `CDPOS` filtered on the object class and date range |
| Which Z-objects changed, by whom, in which transport | `adt_revisions` on candidates from `adt_search` |
| What started dumping | `adt_dumps` |
| Anything left unactivated | `adt_inactive_objects` |

### `E070-AS4DATE` is not an import date

`E070` is the request **header in the system you are querying**. `AS4DATE` is the last
change to that header — creation, or release. It does **not** tell you when the request was
imported into this system, and on PRD it very often is not even the same date: a request
released on the 25th may land on the 28th, or in the next release window, or never.

Import history lives in the transport logs (`STMS` → import history, `ALOG`/`ULOG` on the
transport directory) which are **not reachable over ADT**. So:

- A request found in `E070` on PRD says *somebody released this and it exists here*.
- It does **not** say *this arrived on the day the symptom started*.
- Getting from one to the other needs STMS, and that is a limit to record:

```bash
py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" limit --case support/TCK-10482 \
  --what "S4DK900312'nin PRD'ye tam olarak ne zaman aktarıldığı" \
  --why  "İçe aktarma geçmişi ADT'de yok; E070-AS4DATE serbest bırakma tarihidir" \
  --where "STMS → içe aktarma geçmişi → PRD, 25–29.07 aralığı"
```

Write the claim as *"released on 27.07, touches the address-read function"*, and let the
`observed` row say exactly that. `[CORRELATION]` at best until somebody reads the import
log — which is precisely the distinction §6 of `SKILL.md` grades on.

> Also worth knowing: customising entries live in **`E071K`**, not `E071`. A request that
> looks empty in `E071` may still carry table keys. If the symptom smells like configuration,
> read `E071K` before concluding the transport was harmless.

Filter to objects that plausibly touch the symptom — do not print the whole transport log.

> `CDHDR`/`CDPOS` are **not** in the engine's sensitive-table regex, so change documents read
> freely. Their old/new value columns can still carry personal data. Select the keys and the
> changed field name; do not dump value columns into the report.

## Symptom → opening chain

### Wrong output / wrong value on a document or form

1. From the screenshot: message class + number, transaction, document number.
2. `adt_sql` → `T100` for the real message text. What it *means* is rarely what it says.
3. **`adt_code_search` on the message id** — finds every place in custom code that raises it.
   This is the strongest single move in the whole skill and it needs nothing from the human.
4. `adt_get_source --grep` on the hit. Filtered read only.
5. `adt_revisions` on that object → date, author, transport.
6. `adt_where_used` → who else calls it statically (the *minimum* regression scope, later —
   it does not see dynamic calls, filtered BAdIs, jobs or external consumers).
7. If the path crosses an enhancement: **`adt_badi_discovery`** — definition → interface →
   implementations → *active flag* → implementing class. "Which BAdI is actually running in
   this client with these filter values" is the question a junior can never answer alone.
8. Rule out data: `adt_sql` on the relevant master-data change documents.

### Short dump

1. `adt_dumps` → the entry, its exception class, program, include, line.
2. `adt_get_source --method` on that unit.
3. `adt_revisions` → did it change, or did its *input* change?
4. `adt_where_used` on the failing method → which caller passes the bad value.
5. `adt_syntax_check` / `adt_atc_check` if a recent change is suspected.

A dump names where it *died*, almost never where it went wrong. Walk up the callers.

### Job / background processing failure

1. `adt_dumps` in the job's window first — most "job failed" is a dump.
2. `adt_search` the job's program, then `adt_revisions`.
3. `adt_sql` on the application tables for the selection the job would have made: is the
   input set empty, or is the processing wrong? Different tickets entirely.

### Authorization

1. Get the exact failing object and field from the screenshot or `SU53` output.
2. `adt_code_search` for the `AUTHORITY-CHECK` on that object in custom code.
3. `adt_get_source --grep` → is the check itself wrong, or is the role wrong?

Do not stop at "give them the role". Whether the check is correct is the actual question,
and it is the one Basis cannot answer.

### Performance

1. `adt_get_source --method` on the reported unit.
2. `adt_where_used` for call frequency — a slow call in a loop is a different fix.
3. `adt_atc_check` — SELECT-in-LOOP and missing index findings are usually already there.
4. `adt_revisions` — did it get slower, or was it always slow and the data grew? Only the
   second one is a data-volume problem.

## Rules that hold across every chain

**Filtered reads only.** `adt_get_source` takes `grep=` and `method=` for exactly this
reason. Unfiltered class reads end the session in three calls.

**Prove it on the system that has the problem.** A finding read from DEV does not establish
a PRD defect. `case.py check` enforces this — it fails a case whose only observed evidence
comes from a different system than the one on the ticket.

**Screenshot claims must be re-verified.** `reported` becomes `observed` only via a tool
call against the named system.

**When ADT refuses, say which call and why.** Missing `S_DEVELOP` display mid-chain is not
"I couldn't determine the cause" — it is a concrete, named request for Basis. Put it in the
report as such.

**Watch the auth circuit breaker.** The sap-adt engine trips it deliberately to stop SAP account
lockout. If it fires, stop and tell the consultant; do not retry around it.
