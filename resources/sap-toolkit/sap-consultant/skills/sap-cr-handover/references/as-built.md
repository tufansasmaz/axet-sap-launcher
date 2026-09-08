# As-built — reading the truth out of the transport

The specification says what was intended. The transport says what was collected. When they
differ, the transport wins, and the difference is the most useful paragraph in the handover
document.

What the transport does **not** say: that it was imported anywhere, or that anything works.
Keep those separate — see "the four states" below.

---

## The inventory

**E070** — the request header: owner, status, target, and the date of the last header change.

```sql
SELECT trkorr, trfunction, trstatus, tarsystem, as4user, as4date
  FROM e070 WHERE trkorr = 'S4DK900431'
```

> `AS4DATE` is **creation or release**, not import. Nothing in `E070` tells you whether this
> request reached QA or production; that is STMS import history, and ADT cannot read it.
> `TRSTATUS` distinguishes modifiable (`D`/`L`) from released (`R`/`N`/`O`) — released is not
> imported either.

**E071** — the object list.

```sql
SELECT trkorr, pgmid, object, obj_name
  FROM e071 WHERE trkorr = 'S4DK900431' ORDER BY object, obj_name
```

**E071K** — the *customising* entries: table keys, condition records, number ranges. Half of
a typical SD or MM change lives here and none of it appears in `E071`.

```sql
SELECT trkorr, objname, tabkey
  FROM e071k WHERE trkorr = 'S4DK900432' ORDER BY objname
```

**Skipping `E071K` is the single most common way this skill under-reports a delivery.** A
customising request reads as nearly empty in `E071` and carries two hundred keys in `E071K`.
If the CR touched configuration at all, read it, and say how many keys against which tables
— not the key values themselves, which can carry business data.

### One CR is normally several requests

Read the **task** rows as well as the request row (`E070` where `strkorr` = your request):
work split across two developers lands in two tasks, and a request-level read alone can miss
half the delivery.

Then widen further. A CR routinely has:

- a **workbench** request for the code (`E070-TRFUNCTION` = `K`),
- a **customising** request for the config (`W`), often released on a different day,
- one or more **tasks** under each (`S`, `R`), one per developer,
- occasionally a follow-up request for a defect found in UAT.

Ask the consultant which requests belong to this CR, then verify each one rather than
assuming the list is complete. Document every request number in the internal section: the
person doing the import needs all of them, in order, and a missing customising request is
the classic go-live failure — the code lands, the config does not, the feature is dead in
production.

Watch for a class whose includes are scattered across several requests — `adt_check_scatter`
names this directly. A scattered class means part of the delivery is in a transport you are not
documenting, and it will import into QA without the rest.

## Per object

| Question | Tool | What it gives the document |
|---|---|---|
| who changed it, when, in which request | `adt_revisions` | the audit line, and whether somebody else was in there too |
| what the changed unit now does | `adt_get_source` with `method=` / `grep=` | the description, written from code not memory |
| what calls it statically | `adt_where_used` | the *minimum* regression scope (SKILL.md §5) — misses dynamic calls, filtered BAdIs, jobs, external consumers |
| is it clean | `adt_atc_check` | findings introduced by this delivery, versus pre-existing |
| do the tests pass | `adt_unit_test` | an evidence row, not a recollection |

Every one of these becomes a ledger row tagged `asbuilt`, with `--confidence observed`. The
gate refuses a handover with no `asbuilt` row, precisely because writing the document from the
specification is the easy, invisible failure.

## "Delivered" is four claims — separate them

Collapsing these into one ✅ is how a handover document ends up asserting that something
works when all anybody established is that it compiles.

| State | Test | Can you establish it? |
|---|---|---|
| 🔧 **Yazıldı** | you read the code and it implements the requirement | yes — `adt_get_source` |
| 📦 **Toplandı** | it is in a request | yes — `E071` / `E071K` |
| 🚚 **Aktarıldı** | it reached QA or production | **no** — STMS import history, or the consultant |
| ✅ **Test edildi** | somebody ran it and it passed | **no** — a named person says so |

The honest default for a requirement this skill verified end to end is **🔧📦**. Anything
beyond that is somebody else's statement, and it carries their name. `adt_unit_test` passing
is evidence for 🔧, not for ✅ — a green unit test says the code does what the developer
thought, which is the thing in question.

### And then how the requirement fared

| State | Test |
|---|---|
| ⚠️ **Kısmi** | it works for the main case but a stated part of the requirement is not covered |
| ❌ **Teslim edilmedi** | nothing in any of the requests implements it |
| ➕ **Kapsam dışı eklendi** | it is in a request and not in the spec |

⚠️ is the state people avoid, because it invites a conversation. Write it anyway, and write
*exactly* what is missing — "tek seviyede çalışıyor, müşteri grubu bazında değil" — so the
customer can decide whether they care. Half of the time they do not, and it costs you nothing
to have said it.

➕ needs a reason attached. Collateral changes (a helper method, a message text, a fixed typo)
are normal and just get documented. Genuine scope creep gets documented **with its effort**,
because that effort is currently invisible and is being absorbed for free.

## Objects that are in no transport at all

A table entry maintained directly, a variant, a job definition, a role change, a number
range set by hand. These appear in neither `E071` nor `E071K` and they are a classic go-live
failure: the code imports, the manual setting does not exist in the target, and the feature
is dead in production.

Ask once, explicitly: *"kod dışında bu geliştirme için elle yapılan bir ayar var mı?"* — then
list whatever comes back in the handover document under its own heading, and record the gap
so the document does not imply the transport list is complete:

```bash
py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" limit --case cr/CR-2291 \
  --what "Taşımaya girmeyen elle yapılmış ayarlar" \
  --why  "Varyant, iş tanımı, rol ve doğrudan tablo bakımı hiçbir istekte görünmez" \
  --where "Geliştirici + fonksiyonel danışman; hedef sistemde tek tek doğrulanmalı"
```

It is the one part of the as-built you cannot read out of the system.

## What the document says when they differ

Page 1, above the delivery table, in one sentence:

> Taşıma isteği ile spesifikasyon arasında iki fark var: uyarı raporu teslim edilmedi
> (22.07'de kapsam dışı bırakıldı), limit tanımı tek seviyede çalışıyor.

Not a footnote. Not an appendix. The reader who only reads page 1 is exactly the reader who
must not be surprised in UAT.
