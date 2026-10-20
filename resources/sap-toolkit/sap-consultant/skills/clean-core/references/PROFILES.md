# Clean Core profiles

One project, one profile. The profile says what the project does with a standard SAP
object at each Clean Core level, and which extension techniques it accepts. It is the
**single place** these rules live: `ts-generator`, `fs-generator`, `abap-code-review`,
`abap-code-checker` and `spec-reviewer` read it from here and do not restate it.

Until 2026-10-01 each brief described its Clean Core stance in a sentence ("baştan uyum
beklenir", "tercih değil, maliyet kalemi") and each skill read that sentence its own way.
The same `SELECT` from `MARA` was a blocker in one document and unmentioned in the next.

## Where the profile comes from

The project brief's front matter carries one line:

```
clean_core: s4-balanced
```

- The line is there → use it. Never ask, never override it from the conversation.
- The line is missing → **ask once** which profile applies, and remind that the project
  lead should set it in the central brief. If the person cannot say, or says "taslak",
  use the strictest profile of the brief's platform (`public` on Public Cloud,
  `s4-strict` on Private Cloud / on-premise, `ecc` on ECC) and write at the top of the
  Clean Core section: *"Clean Core profili reçetede yok; en katı varsayımla (`<profil>`)
  yazıldı."* A document never quietly uses a looser profile than it was given.
- The line names a profile that does not fit the brief's product (`s4-legacy` on a
  Public Cloud brief) → stop and say so. The checker refuses that combination too.

## The profiles

The table below is the machine table in `scripts/clean_core_checker.py` (`PROFILES`);
`py scripts/clean_core_checker.py --list-profiles` prints it, and the tests hold the two
equal. Levels are SAP's own, as its Cloudification Repository states them: **A** released
API · **B** classic API · **C** not an API (internal; `C+` when SAP names a successor,
`C` when it does not) · **D** deprecated / `noAPI`. *unknown* is an object the repository
has no entry for on the project's release — many classic BAdIs and `REUSE_*` function
modules are in that state.

| profile | platform | A | B | C+ | C | D | unknown | classic_ext | modification |
|---|---|---|---|---|---|---|---|---|---|
| `public` | S/4HANA Cloud Public Edition, BTP ABAP | free | forbidden | forbidden | forbidden | forbidden | blocked | forbidden | forbidden |
| `s4-strict` | Private Cloud (RISE), on-premise | free | reason | forbidden | approval | forbidden | blocked | reason | forbidden |
| `s4-balanced` | Private Cloud (RISE), on-premise | free | free | reason | note | forbidden | unverified | free | forbidden |
| `s4-legacy` | Private Cloud (RISE), on-premise | free | free | note | note | no_new | unverified | free | no_new |
| `ecc` | SAP ECC | not_measured | not_measured | not_measured | not_measured | not_measured | not_measured | free | forbidden |

`classic_ext` is a classic extension technique: a classic BAdI, a customer / user exit,
an explicit enhancement spot. `modification` is a change to SAP's own object, an
**implicit** enhancement, or a direct write to a standard table. Neither is an object the
checker can look up; the documents apply these two columns themselves.

Which one, in a sentence:

- **`public`** — the platform enforces it. Nothing but released objects compiles.
- **`s4-strict`** — a new system the customer wants to keep upgrade-safe or move to Public
  Cloud later. Development is ABAP Cloud; a classic API is the exception that is written
  down.
- **`s4-balanced`** — the default for a greenfield on Private Cloud or on-premise. BAPIs,
  classic BAdIs and classic APIs are normal work; an internal SAP object needs its reason
  when SAP offers a successor.
- **`s4-legacy`** — a converted or brownfield system carrying years of Z code. What is
  there is carried and listed; what is new does not add modifications or level D use.
- **`ecc`** — SAP publishes no release list for ECC, so nothing is measured. Two rules
  remain: no modification, and nothing the S/4HANA simplification list removes.

RISE and on-premise share the three `s4-` profiles: it is the same stack, and the
difference between them is commercial, not technical.

## What each decision means, and what the document writes

| decision | meaning | written in the document as |
|---|---|---|
| `free` | use it | `Serbest` (`Released` for level A) |
| `reason` | use it, with a written reason; name the successor that was not taken | `Gerekçeyle — <gerekçe>` |
| `approval` | an exception: a written reason **and** the project lead's approval before it is built | `İstisna — onay bekliyor` until approved |
| `note` | use it; it is listed, with its successor when SAP names one | `Listelendi` (+ `ikame: <nesne>` when SAP names one) |
| `forbidden` | do not use; take the successor, or redesign | `Yasak (ikame: <nesne>)` — `(ikame yok)` when none |
| `no_new` | no new use; an existing use is carried and listed | `Yeni kullanım yasak` / for existing code `Taşındı, envanterde` |
| `blocked` | nobody answered for this object: not used until verified | `Doğrulanamadı — doğrulanana kadar kullanılmaz` |
| `unverified` | nobody answered for this object: may be used, listed as unverified | `Doğrulanamadı` + why (*çevrimdışı* / *SAP deposunda kayıt yok*) |
| `not_measured` | ECC: no release list exists | `Ölçülmez (ECC)` |

Every `reason`, `approval` and `no_new` (existing) row is a decision someone owns. The
TS collects them in its "SENİN KARARIN GEREKEN N NOKTA" list; a code review puts them in
its findings. An `approval` that nobody approved is an open item, not a design.

`unknown` is never `free`: an object the repository does not know is unknown, not clean.
On `public` and `s4-strict` that blocks it; on the other two it is used and says so.

## Extension technique per profile

The TS chooses a technique per gap, lowest level first (its STEP 3). The profile decides
which levels exist:

| level | technique | public | s4-strict | s4-balanced | s4-legacy | ecc |
|---|---|---|---|---|---|---|
| 1 | Key user extensibility (custom field, custom logic, UI adaptation) | free | free | free | free | does not exist |
| 2 | Developer extensibility (ABAP Cloud: RAP, released API, released BAdI) | free | free | free | free | does not exist |
| 3 | Side-by-side on BTP (CAP, Integration Suite, Build) | free | free | free | free | free |
| 4 | Classic extensibility (classic BAdI, exit, explicit enhancement) | does not exist | reason | free | free | free |
| — | Modification, implicit enhancement, direct write to a standard table | does not exist | forbidden | forbidden | no new | forbidden |

"Lowest viable level first" holds on every profile: `free` at level 4 does not make
level 4 the first choice, it removes the exception paperwork when level 1–3 cannot do
the job.

## Severity in a code review or a quality gate

| what the code does | public · s4-strict | s4-balanced | s4-legacy |
|---|---|---|---|
| uses a `forbidden` object, or modifies SAP code | blocker | blocker | blocker when the code is new; listed when it was carried |
| uses a `blocked` object | blocker until verified | — | — |
| uses a `reason` / `approval` object with no reason on record | major | major | — |
| uses a `note` or `unverified` object | — | info, listed | info, listed |

On `ecc`, only modification and a simplification-list item are findings.

## Calling the checker with a profile

```bash
py <SCRIPTS_DIR>/clean_core_checker.py MARA EKKO BAPI_PO_CREATE1 --profile s4-balanced --s4core 109 --sp 1 --json
py <SCRIPTS_DIR>/clean_core_checker.py I_PRODUCT CL_SALV_TABLE --profile public --json
```

`--profile` replaces `--level`. The system type follows from the profile (`public` →
`public_cloud`; an `s4-` profile → `private_cloud`, or pass `--system-type on_premise`);
the release still comes from the brief (`--s4core` / `--sp`, or `--version`). Each result
carries `decision` next to `verdict` and `verified`; read the document's wording from
`decision`, per object, never from the run's summary line.

## Public Cloud is a different document

On `public` the rules above are the smaller half. Whole sections of a TS — reports,
selection screens, Dynpros, classic transports — describe things the platform does not
have. [`PUBLIC_CLOUD.md`](PUBLIC_CLOUD.md) says what replaces each.
