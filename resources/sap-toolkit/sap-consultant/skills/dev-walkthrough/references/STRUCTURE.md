# Walkthrough structure

One file, `anlatim.md`. The headings below are what `check_walkthrough.py` looks for;
either the Turkish or the English set works, one per document.

| # | Turkish | English |
|---|---|---|
| 1 | `## Ne yapar` | `## What it does` |
| 2 | `## Akış` | `## Flow` |
| 3 | `## Nesneler` | `## Objects` |
| 4 | `## Veri` | `## Data` |
| 5 | `## Kararlar` | `## Decisions` |
| 6 | `## Revizyon rehberi` | `## Revision guide` |
| 7 | `## Bilinmeyenler` | `## Unknowns` |

Situation A (a TS, nothing built): only 1, 2, 3 (planned objects) and 7 are required.

## Objects table

| Object | Type | What it is for | Called by | Reads / writes | If it changes |
|---|---|---|---|---|---|

A technical name is written exactly as the system spells it, and explained the first time:
`ZQM016_CL_INSPCTRL (business-logic class)`. Names come from the evidence; a name that is
only in your head is not written.

## Revision guide — the table that matters

One row per change a revision is likely to ask for. Fill it from the code you read: which
objects hold the logic, which tables the change touches, what to re-test.

| If this is asked | Objects to change | Tables / fields touched | Re-test | Do NOT touch |
|---|---|---|---|---|
| *a new reason value on the maintenance table* | the maintenance table's data element, the check in the save method | the reason table, `REASON_ID` | save with a new value; the F4 | the screen, the interface class |

A row you cannot fill from the code is `[BİLİNMİYOR]`, not a guess: a wrong row sends the
developer to the wrong place, which is the problem this skill exists to remove.

## The questions (section 5 of SKILL.md)

Take rows from the Revision guide and turn each into one question: *"Revizyon: <the first
column>. Hangi nesnelere dokunursun, nelere dokunmazsın, neyi yeniden test edersin?"* The
answer is in the row. Mix in one row where the honest answer is "this is not in the walkthrough":
the developer should learn that `[BİLİNMİYOR]` means *ask*, not *guess*.
