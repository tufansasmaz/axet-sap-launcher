# Designing the layout: what held up

From one real build — a multi-page quotation document, header structure plus an item table,
rendered through ADS on a DEV system. **Measured on that document only.** Another layout type
(a label, a delivery note with a different table) was not tried; treat these as a starting
point and render yours.

## Five layout traps (each cost hours)

| # | Symptom | Real cause | Fix |
|---|---|---|---|
| 4 | The layout was uploaded, the PDF still shows the OLD design | ADS caches a template by the `uuid` / `timeStamp` on the XDP root. An XDP taken from SFP or Designer and uploaded with the same uuid is served from cache | `generate_adobe.py` now writes a fresh uuid/timeStamp on every `SET_LAYOUT`. Deleting the form is not needed: six versions in a row on one form all showed |
| 5 | The item table or some fields are empty | An XDP written by hand has no data schema (`dataDescription`, `connectionSet`) | Derive from an XDP that carries the schema and change only its `<template>` part: first `GET_LAYOUT` and look for `dataDescription`; if there is none, the developer opens the form in SFP once and saves it (`xdp_lint.py` warns `data-schema` on bound fields without a schema) |
| 6 | Of several sub-forms bound to one data group only the first is filled | Binding many sub-forms to `$record.IS_HDR` is unreliable | Bind each field by an absolute path, `ref="$record.IS_HDR.FIELD"`; wrappers get `bind match="none"` |
| 7 | On page 2 the table header overprints | A repeated header (`overflow leader`) is not drawn with flowed layout | Header row `layout="position"`, each column fixed by `x` / `w` |
| 8 | A row's last column drops to the next line | The columns add up to the row width or more | Make the column total smaller than the row by the inner margin plus about 1 mm (`scripts/xdp_lint.py` warns on rows of 5 or more) |

(Traps 1–3 — the missing DOCPARAMS, the doubled context, STATUS saying "compatible" while the
PDF is empty — are in SKILL.md.)

## A pattern that rendered correctly

- **Page:** A4, content area 7.27 in (margin 0.5 in), footer inside the `pageArea` (a `draw` and a page-number field).
- **Header band:** dark fill, white title (18 pt, bold), a small label with a large value on the right; a 1.2 mm accent strip under it.
- **Info cards:** label above (7 pt, grey, capitals), value below (10.5 pt, dark), a thin rule under the cell.
- **Table:** dark header row (white, 7.5 pt), body 9 pt, a thin grey rule per row, numbers right-aligned, the amount column bold.
- **Numbers and dates:** `numericEdit` with `<picture>num{z,zzz,zzz,zz9.99}</picture>` (shows `214.455,00` in tr_TR); dates `dateTimeEdit` with `date{DD.MM.YYYY}`; quantities `num{z,zzz,zz9}`.
- **Totals box:** light fill, label, a 14 pt bold amount, the currency in its own field.
- **Hide when empty:** an `initialize` event with FormCalc `if (HasValue(...) == 0) then $.presence = "hidden" endif`.
- **Several pages:** put the table and its header in one container and give the container `<overflow leader="HeadRow"/>`.
- **Page number:** a `ready` event with `ref="$layout"` in **JavaScript**
  (`this.rawValue = "Sayfa " + xfa.layout.page(this) + " / " + xfa.layout.pageCount()`, `runAt="both"`).
  FormCalc was tried and did not work.
- **Font:** Arial (present on ADS); the colour goes in `fill` inside `font`.
- **Binding (the SAP pattern):** root sub-form named `data`; the row group `$record.<TABLE>`, the row sub-form `DATA[*]`, fields by their plain name; header fields by absolute path.
