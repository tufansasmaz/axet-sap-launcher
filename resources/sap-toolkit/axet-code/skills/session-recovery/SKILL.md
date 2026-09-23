---
name: session-recovery
description: >
  Use when an aXet.code session is dead — every message to it comes back as a
  400 saying `unexpected tool_use_id found in tool_result blocks ... Each
  tool_result block must have a corresponding tool_use block`, or the sibling
  `tool_use ids were found without tool_result`. Repairs the session's stored
  history in place so the session can be used again; deletes nothing.
  Triggers in Turkish or English: "session öldü", "oturum bozuldu", "önceki
  session'u kurtar", "session'u onar", "bad request alıyorum", "tool_use
  hatası", "recover the previous session", "fix broken session", or a pasted
  400 with that text.
  Run it from a DIFFERENT session — the broken one cannot run anything.
author: "Dogukan Durak <dogukan.durak@nttdata.com>"
---

# session-recovery — bringing a dead aXet.code session back

## What broke

aXet.code stores a turn as an assistant message carrying `tool_call` parts,
then a `tool` message carrying the matching `tool_result`. When the gateway
errors mid-stream the client can run the tool and save its result while
**dropping the assistant message that held the call**. What is left on disk is
an orphaned `tool_result`.

Every later request replays the whole history, the API rejects the unpaired
result, and the session is stuck permanently. "Continue where we left off"
does not help: the damage is in the stored history, not in live state.

**It is not caused by parallel tool-calls, and not by interrupting a call.**
That was the first theory; SQLite forensics on two independently broken
sessions (2026-09-21) disproved it. Those are real but different failures — do
not conflate them, and do not accept a rule that bans parallel calls on this
basis.

## Before you touch anything

- **Run this from another session.** The broken one cannot execute a tool.
- This is the only thing in the kit that **writes to the agent host's own
  database**. Treat it accordingly: dry run first, show the person what was
  found, get an explicit yes, and only then `--apply`.
- The script backs the database up before writing and never deletes a row.

```bash
py <SCRIPTS>/repair_session.py                      # dry run, this project
py <SCRIPTS>/repair_session.py --session <id> --apply
py <SCRIPTS>/repair_session.py --db "<path to axet-code.db>" --scan-last 20
```

The store is found in the project's `.axet-code/` first, then the user's own
`axet-code` folder. `--db` overrides both.

## What the repair does

For each orphan it inserts a synthetic assistant message carrying a
`tool_call` with the orphan's id and tool name, placed **before** it. The
original `tool_result` is kept, so the tool's actual output survives — an
earlier ad-hoc fix deleted the orphan and lost it.

Placement is the whole trick and it is where the first version failed.
`created_at` is whole seconds and the client orders by `(created_at, rowid)`;
a row inserted now always takes the higher rowid, so the placeholder can only
win on `created_at`. It therefore goes **one second earlier** — and when the
previous message already occupies that second, the orphan is nudged one second
**forward** instead. That rewrites one integer on one row, never its content.

Measured 2026-09-22: the original script placed the placeholder in the *same*
second every time, lost the rowid tiebreak, and repaired nothing — while
reporting success to anyone who did not re-scan. If you are handed that
version, do not use it.

## Reading the result

| exit | meaning | what to say |
|---|---|---|
| 0 | repaired, or nothing was wrong | which session, how many placeholders; the session is usable again |
| 3 | no session store found | ask for the path, pass `--db` |
| 4 | **the schema is not one this script knows** | aXet.code changed its store. Nothing was touched. Report it — do not force it |
| 5 | **repair ran but orphans remain** | the backup named in the output is the state before the run. Do not retry blindly |

Exit 4 and 5 are the two that matter. The script re-verifies after writing,
using the same walk the client uses, because a repair that lands on the wrong
side of the orphan otherwise looks like a success.

## Things that bite

- **The schema is not ours.** It belongs to aXet.code and can change in any
  release. The script refuses an unfamiliar shape rather than guessing, which
  is why exit 4 exists. A guess here would write nonsense into the store that
  holds every session the consultant has.
- **This is a workaround, not a fix.** The bug is in aXet.code's own
  persistence and cannot be fixed from a skill or a `CLAUDE.md`. It should be
  reported to the aXet team; this skill only heals the symptom afterwards.
- **A locked database.** If aXet.code is writing at that instant you get
  `database is locked`. Retry once; closing the other session helps.
- **Placeholder arguments are lost.** Only the call's *id* and *name* can be
  recovered — what the assistant actually asked for is gone with the dropped
  message. The tool's output is intact, so the conversation still reads.
