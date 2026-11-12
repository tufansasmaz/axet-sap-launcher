---
name: sap-tcode-tmg-gen
description: >
  Create SAP transaction codes (SE93) and table maintenance dialogs (SE11/SE54 "Table
  Maintenance Generator", SM30) WITHOUT SAP GUI. ADT has no endpoint for either, so this
  skill drives two small Remote-Enabled generator FMs over SOAP-RFC (/sap/bc/soap/rfc).
  Use after a Z table / report exists and the developer needs its t-code or its SM30
  maintenance screen. Triggers: tcode oluştur, SE93, işlem kodu, bakım ekranı, bakım tablosu,
  SM30, SE54, table maintenance generator, TMG, "tablo için bakım diyaloğu üret".
allowed-tools: Bash(python:*), Read, Write, Edit, Grep, Glob
---

# SAP t-code + table maintenance generator

> **NTT Studio uyarlaması — onaylı RFC üretimi (yukarıdaki/aşağıdaki "Install" ve
> `.conn_adt` anlatımının yerine geçer).** Bu skill yalnız **teknik danışman** profilinde
> ve yalnız **DEV** sistemde çalışır. Betikler (`scripts/*.py`) parolayı OKUMAZ ve SAP'a
> kendileri gitmez: `soap_rfc.py` çağrıyı NTT Studio'nun onaylı sunucusuna
> (`$ABAP_HTTP_URL/tool/axet_rfc_uret`, jeton `$ABAP_HTTP_TOKEN`) gönderir; sunucu
> nesneyi, paketi, transport'u gösteren bir **onay penceresi** açar ve RFC'yi ancak
> kullanıcı onaylarsa kendi SAP oturumuyla yapar. Her yazma kendi penceresi (oturum izni
> kapsamaz); onay tek kullanımlık.
>
> - Çıkış **3** + `approval_pending:` satırı → kullanıcıya NTT Studio'daki pencereyi söyle;
>   onaylayınca **AYNI komutu AYNI argümanlarla** tekrar çalıştır.
> - Çıkış **2** + `REFUSED [GR_TIER]` → sistem DEV değil; `REFUSED [GR_ROLE]` → bu rolde/
>   sistemde yazma sunucusu yok; `REFUSED [GR_APPROVAL] approval_denied` → dur, başka yoldan
>   deneme. `paket_gerekli` / `transport_belirsiz` → paketi ve transport'u kullanıcıya SOR
>   (`adt_list_package`, `adt_list_transports`); asla tahmin etme.
> - Üreteç FM'i sistemde yoksa sunucu onu `$TMP`'ye (`ZND_FG_AUTO_GEN`) **ayrı bir onay
>   penceresiyle** kendisi kurar. `screen-gen/scripts/bootstrap_fm.py`'yi elle ÇALIŞTIRMA.
> - HOOK kaynağı (`--source-file`) için önce `%abap-code-review`, sonra
>   `axet_inceleme_kaydet` (`tip="ENHO"`, nesne = enhancement adı); kayıt yoksa
>   `inceleme_yok`, kritik bulgu varsa `kritik_bulgu` ile durur.

Companion to `sap-adt` (writes objects) and `screen-gen` (same generator-FM pattern).
Verified on S/4HANA 2023 (DS4). Everything below was run, not assumed.

## Why generators

| Need | Standard API | Problem |
|---|---|---|
| t-code | `RPY_TRANSACTION_INSERT` / `_DELETE` | not RFC-enabled, ADT has no TRAN endpoint |
| TMG | none (`VIEW_MAINTENANCE_GENERATE` only does `CALL TRANSACTION 'SE55'`) | dialog only |

So the wrapper FMs are installed once per system into `$TMP` (local, no transport), group
`ZND_FG_AUTO_GEN`, same place as `ZND_FM_ADOBE_GEN`:

| FM | Does | Source |
|---|---|---|
| `ZND_FM_TCODE_GEN` | create/delete report t-code (`R`) or SM30 parameter t-code (`P`) | `bootstrap/ZND_FM_TCODE_GEN.func.abap` |
| `ZND_FM_TMG_GEN` | batch input on SE54: `SAPMSVIM 0050` (`=CRMO`) -> popup -> `0120` (`=GENE`) -> object-directory popups | `bootstrap/ZND_FM_TMG_GEN.func.abap` |
| `ZND_FM_TABLE_SEED` | write TEST rows into a Z/Y customizing table (delivery class `C` only) | `bootstrap/ZND_FM_TABLE_SEED.func.abap` |
| `ZND_FM_DYNPRO_DUMP` | read-only: lists a dynpro's fields, push-button FCODEs, flow logic (use to extend the BDC) | `bootstrap/ZND_FM_DYNPRO_DUMP.func.abap` |

## Rules (non-negotiable)

- **Transport: ask the user, never invent one.** A transportable package needs an open
  request the user named or confirmed (`adt_list_transports` to show candidates). The
  scripts refuse a transportable package without `--transport`.
- **Installing a generator: say it out loud first** - "I am writing three function modules
  to `$TMP` (function group `ZND_FG_AUTO_GEN`) on this system" - then install. Say how many
  (three for t-code/TMG/dump, a fourth if the user wants test data seeded).
- **The generator is a tool, not one of the task's objects.** "Create every object in package
  X on request Y" covers the table, function group, t-code and maintenance dialog you build;
  it does not forbid the one-time `$TMP` install of the generator FMs. Do not stop over it.
  Install (dev/sandbox only), carry on, and list the installed FMs in the final report. When
  nobody can be asked (a headless or scripted run), "say it" means: put it in that report.
  Measured 2026-11-11: an agent refused the whole maintenance dialog on exactly this reading.
- **Never install the generators on PRD or QA.** Dev/sandbox systems only. If the system
  role is unknown, ask. (T-codes and TMG screens reach PRD/QA by transport, not by this skill.)

## Install (once per system, tell the user it writes to `$TMP`)

```
python <skills>/screen-gen/scripts/bootstrap_fm.py --source-file bootstrap/ZND_FM_TCODE_GEN.func.abap \
  --fm-name ZND_FM_TCODE_GEN --fg-name ZND_FG_AUTO_GEN --description "Transaction code generator (RFC)" --cwd <project>
```
Same for `ZND_FM_TMG_GEN`, `ZND_FM_DYNPRO_DUMP` and, only when test data is wanted,
`ZND_FM_TABLE_SEED`. **`ZND_FM_TMG_GEN` gained the `RESET` action on 2026-11-09: a system that
has the older copy must have it re-installed before `--reset` works** (the older FM does not know
`IV_ACTION`, the call fails instead of regenerating). `bootstrap_fm.py` creates the FM already
Remote-Enabled (via SAP's `RPY_FUNCTIONMODULE_INSERT`). If it fails with
`Session not found` on the function-group step, update the source with the sap-adt tool
`adt_write_function_module` instead (the FM is already RFC; the flag survives).
(Also: a Remote-Enabled flag CAN be set later through ADT by PUT of the FM metadata with
`fmodule:processingType="rfc"` while locked, then activate through
`POST /sap/bc/adt/activation` - ADT only rejects it as a create attribute.)

## T-code

```
python scripts/gen_tcode.py --cwd . --tcode ZPM_MP_REPROC --text "Reprocess ..." \
    --program ZPM_P_X --package ZPM --transport <OPEN REQUEST>
python scripts/gen_tcode.py --cwd . --tcode ZPM_MP_SET --text "..." --view ZPM_T_MP_MATKL \
    --package ZPM --transport <OPEN REQUEST>
python scripts/gen_tcode.py --cwd . --tcode ZND_TEST --delete --package '$TMP'
```
- SM30 t-code: `--view` is the **table (or maintenance view) name**, NOT the TOBJ name
  (`ZPM_T_X_S`). Result is identical to a hand-made one: `TSTCP.PARAM =
  /*SM30 VIEWNAME=<table>;UPDATE=X;`, `CINFO=02`. Report t-code: `CINFO=80`, `DYPNO=1000`.
- Naming: copy the project's existing pattern (`SELECT tcode FROM tstc WHERE tcode LIKE 'Z<MOD>%'`).
- Z/Y namespace only. Transportable package needs an open request the user confirmed
  (`adt_list_transports`); the entry lands in the user's task (`E071`, `R3TR TRAN`).

## Table maintenance dialog

```
python scripts/gen_tmg.py --cwd . --table ZPM_T_MP_DEF --fugr ZFG_PM_MP_SET --package ZPM \
    --transport <OPEN REQUEST> --liste 0002
```
> **Transportable CREATE: verified on NS4 (2026-11-11).** `gen_tmg.py` sends `$TMP` to the FM
> (some releases have no `TVDIR-DEVCLASS` input field on SE54 0120, and the run stopped there)
> and answers the popups instead: three object-directory popups (`SAPLSTRD 0100`, the package),
> then request (`SAPLSTRD 0300`, the request) / package pairs. The order shifts once SE54 has
> created the TOBJ entry, so a run that stops on a popup mismatch is retried (up to 3). If a
> system still stops elsewhere, the message names the screen (`[A PROG/DYNPRO] ...`): inspect it
> with `ZND_FM_DYNPRO_DUMP`, pass `--pre/--post`, and record the step here.

Preconditions (check, do not guess): table active; function group exists in the same
package (`adt_create_function_group`); `--liste` is free in that group (second table in the
same group = `0002`; reusing `0001` overwrites the first table's screen). Authorization group
defaults to `&NC&`; one-step maintenance (`--two-step` for two-step).

Regenerate after a table field changed (renamed / retyped / added) - the TMG already exists:
```
python scripts/gen_tmg.py --cwd . --table ZPM_T_MP_DEF --fugr ZFG_PM_MP_SET --package ZPM     --transport <OPEN REQUEST> --reset
```
Verified on ZPM (**transportable**): SE54 `0120 =RESE` > `1240 RES_DYNPRO=X =O.K.` > `1243 LISTSCR=X
=O.K.`; message "Maintenance screen 0002 will be deleted and re-created". Success = `TVDIR`
`GENDATE`/`GENTIME` moved (two runs in the same second would read as "unchanged" - re-read the
screen with `ZND_FM_DYNPRO_DUMP` to confirm the new field). Not a CREATE: with no TMG yet it refuses.

Verified on `$TMP`: result row in `TVDIR` identical to a SE11-generated one
(`LISTE=0001, DETAIL=0000, BASTAB=X`), `TDDAT-CCLASS=&NC&`, TOBJ `<TABLE>S` created, function
group regenerated and active. Transportable package: verified on NS4 2026-11-11 (fresh table,
CREATE, a field added, `--reset`), see the note above.

## Test data

```
python scripts/seed_table.py --cwd . --table ZPM_T_MP_MATKL --rows "MATKL=J36060000|MATKL=J36060100"
```
`FIELD=VALUE;FIELD=VALUE` per row, rows separated by `|`; `MANDT` is filled automatically, `MODIFY`
makes it re-runnable. Guards in the FM: Z/Y namespace, transparent table, delivery class `C`. It
**is not transported** - test data only, real customizing goes through SM30 into a request.
`--delete-first` empties the table in the current client before writing: say so before using it.

## Gotchas learned

- `RSPARAM` here has `FIELD`/`VALUE`, not `SELNAME`/`LOW` (check `DD03L` before writing).
- Macros (`DEFINE`) cannot take table expressions (`lt[ 1 ]`) as arguments: assign first.
- A report-type parameter given as `to_upper( x )` raises `Type conflict during a function module call` - use a typed variable.
- `BDCMSGCOLL` fields are `DYNAME` / `DYNUMB`.
- Function code of the generate button is `GENE` (found by reading `MODULE D0120_PAI`), not `SAVE`.
- `TVDIR-DEVCLASS` and `CORR_CON_S` are not input fields for `$TMP` - skip them there.
- Function group `ZFG_...` that a SE11 TMG creates includes: do NOT hand-edit.
- `adt_push` on a table can report success while SAP rejected the DDL (comments after the
  closing `}` -> HTTP 400 swallowed). Always read the active source back.
- Do not leave scratch tables: a generated TMG makes the table undeletable until `TVDIR`/TOBJ go.

## Safety

Generators carry no authority bypass: `S_DEVELOP`, `S_TCODE` and the transport checks run
inside SAP's own FMs under the calling user. They install into `$TMP`; do not transport them.
