---
name: sap-badi-impl-gen
description: >
  Create enhancement implementations WITHOUT SAP GUI through a Remote-Enabled generator FM over
  SOAP-RFC: source code enhancements (ENHO hook implementation) at explicit enhancement points or
  implicit FORM begin/end points, and new (kernel) BAdI implementations. Tells up front what can
  NOT be done this way (classic BAdIs, SAP-internal BAdIs/spots) so no dead end is designed.
  Triggers: BAdI implementasyonu yarat, SE19, enhancement implementation, ZEI_..., enhancement
  point, örtük enhancement, implicit enhancement, user exit genişlet, "sen implemente et".
allowed-tools: Bash(python:*), Read, Write, Edit, Grep, Glob
---

# SAP enhancement implementation generator

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

Companion to `sap-adt` (writes classes/includes) and `sap-tcode-tmg-gen` (same generator-FM
pattern; `scripts/soap_rfc.py` is a copy of that skill's, so this one works on its own). Everything below was run on S/4HANA 2023 (DS4), not assumed.

## Rules (non-negotiable)

- **Ask the user for the transport request; never invent one.** A transportable package
  without `--transport` is refused by the script.
- **The generator is a tool, not one of the task's objects**: an instruction to put "every
  object" in a package and request covers what you build, not the one-time `$TMP` install of
  the generator FM. Install it (dev/sandbox only) and name it in the final report; in a run
  where nobody can be asked, that report is where you "say so".
- **Before installing the generator, say so**: "I am writing a function module to `$TMP`
  (function group `ZND_FG_AUTO_GEN`) on this system." Never install it on PRD or QA.
- **Before designing anything, check the extension point**: is the BAdI/spot SAP-internal, and
  what has the project already enhanced (`ENHINCINX`)? The queries are below. An internal
  spot or a classic BAdI is a dead end - say so first, do not design around it.
- **Classic BAdI (SXCI) is not possible without SAP GUI.** The FM only returns the SE19
  hint. Leave it as "cannot be done" and ask the user to do it in SE19; do not try a
  workaround.

## What works and what does not

| Target | Without GUI? | How / why |
|---|---|---|
| **Source code enhancement** at an explicit point (`ENHANCEMENT-POINT ... SPOTS <spot>`) or implicit FORM `BEGIN`/`END` | **Yes, verified end to end** | kind `HOOK`: `CL_ENH_FACTORY=>CREATE_ENHANCEMENT` (tool `HOOK_IMPL`) + `CL_ENH_TOOL_HOOK_IMPL->SET_ORIGINAL_OBJECT` / `ADD_HOOK_IMPL`, `SAVE`, `ACTIVATE`, `UNLOCK` |
| New (kernel) BAdI, customer spot | Yes (API path; see status) | kind `NEW`: `CL_ENH_TOOL_BADI_IMPL->SET_SPOT_NAME` / `ADD_IMPLEMENTATION` |
| BAdI / spot flagged **SAP internal** | **No - also not in SE19** | `CX_ENH_SPOT_IS_INTERNAL` / popup "BAdI is internal SAP". Seen: `BADI_SD_SALES_ME_REQ`, `BADI_SD_SALES` (a migrated classic BAdI that SE19 offers as a spot, then refuses) |
| Classic BAdI (SXCI) | **No** | `SXO_IMPL_CREATE` builds an ALV grid (`CL_BADI_FLT_VALUES_ALV`): RFC dumps `DYNPRO_SEND_IN_BACKGROUND`, a batch job ends the step silently, nothing is created. Ask the user (SE19) |

### Check before designing around an extension point
```sql
SELECT enhname, badi_impl, active FROM badiimpl_enh WHERE badi_name = '<BADI>'      -- only SAP impls? suspicious
SELECT enhspot, internal FROM enhspotheader WHERE enhspot = '<SPOT>'                -- INTERNAL = X: forget it
SELECT enhname, full_name, enhmode FROM enhincinx WHERE programname = '<MAINPROG>'  -- what the project already enhanced
```
The last query is the best one: projects usually already hook the classic user exits (e.g.
`\PR:SAPMV45A\FO:USEREXIT_MOVE_FIELD_TO_ME_REQ\SE:BEGIN\EI` -> `INCLUDE zsd_i_... IF FOUND`).
Adding a line to that customer include is cheaper than a new enhancement (the include may be
release-owned: the user adds `R3TR PROG <include>` to the request first).

## Install (once per system, `$TMP`, tell the user)
```
python <skills>/screen-gen/scripts/bootstrap_fm.py \
  --source-file bootstrap/ZND_FM_BADI_IMPL_GEN.func.abap --fm-name ZND_FM_BADI_IMPL_GEN \
  --fg-name ZND_FG_AUTO_GEN --description "BAdI implementation generator (RFC)" --cwd <project>
```
Later source changes: `adt_write_function_module` (the RFC flag survives).

## Source code enhancement (kind HOOK)
```
python scripts/gen_badi_impl.py --cwd . --kind HOOK --enhname ZEI_<NAME> --program SAPMV45A \
    --full-name '\PR:SAPMV45A\EX:BELEG_SICHERN_14\EI' --spot ES_SAPMV45A \
    --source-file plugin.abap --text "<English text>" --package <PKG> --transport <REQUEST>
```
- `--full-name`: explicit point `\PR:<main>\EX:<point>\EI` (enhmode `D`, default, `--spot`
  required); implicit FORM point `\PR:<main>\FO:<form>\SE:BEGIN|END\EI` with `--enhmode S`
  (no spot). Copy the format from `ENHINCINX` of an existing implementation.
- `--program` is the **main program** (`SAPMV45A`), not the include holding the point.
- The plug-in code sees the globals at that point (e.g. `vbak`, `xvbep[]` in `SAPMV45A`).
  Keep it to one call of a Z class: logic, tests and documentation live in the class.
- Afterwards: `adt_syntax_check` on the main program, read the ENHO source back
  (`GET /sap/bc/adt/enhancements/enhoxhh/<name>/source/main`), check `ENHINCINX`/`E071`.
- Verified: `ZEI_SD_PR_SPLIT_SAVE` at `BELEG_SICHERN_14` of `SAPMV45A`, package `ZSD`,
  transportable request, active, `SAPMV45A` syntax OK.

## New BAdI implementation (kind NEW)
1. Write the class first (`sap-adt`): `INTERFACES <BAdI interface>.`
2. Run:
```
python scripts/gen_badi_impl.py --cwd . --kind NEW --spot <SPOT> --badi <BADI> \
    --enhname ZEI_<NAME> --impl ZEI_<NAME> --class ZCL_IM_EI_<NAME> \
    --package <PKG> --transport <REQUEST> [--inactive]
```
**Status (verified on NS4 2026-11-12):** a full create on a customer spot works -- an
implementation of `ZND007_BADI_MAIL` with `--inactive` was created in the given request
(`BADIIMPL_ENH-ACTIVE` blank, so the BAdI does not call it), then deleted. `--text` is
NOT sent for this kind: SAP stores the text through a TADIR insert that asks for the
request in a dialog, which over RFC dumps (`DYNPRO_SEND_IN_BACKGROUND`, nothing created).
The tool warns and leaves the text out; add it in SE19. Prefer `--inactive` when the BAdI
belongs to someone else's code: an active implementation runs in their process at once.

## Naming
Copy the project: `SELECT enhname FROM enhheader WHERE enhname LIKE 'Z%'`
(here `ZEI_<area>_<topic>`, BAdI class `ZCL_IM_EI_<area>_<topic>`, the SE19 default).

## Gotchas learned
- Read the SAP code that fills the data before picking the hook (e.g. `FV45EFMA_BESCHAFFUNG_FUELLEN_F`
  for SD -> PR: old user exit, CMOD customer-function, internal BAdI, in call order) and the
  save sequence (`MV45AF0B_BELEG_SICHERN`): a hook after `RV_SALES_DOCUMENT_ADD ... IN UPDATE
  TASK` is too late to change the document tables.
- `adt_sql` statements longer than ~255 characters are cut: keep them short.
- Many `adt_sql` calls exhaust "temporary subroutine pools": restart the ADT server.
- Failed runs leave nothing behind (`ROLLBACK WORK` + `UNLOCK`). An ENHO shell a user created in
  SE19 by mistake blocks the name: delete it first.
- `adt_remove_from_transport` cannot remove deletion entries of deleted objects; the user does it
  in SE09 (or leaves them, harmless).

## Safety
No authority bypass: `S_DEVELOP`, enhancement locks and CTS checks run inside SAP's APIs under
the calling user. Customer namespace (Z/Y) only. The generator lives in `$TMP`; do not transport it.
