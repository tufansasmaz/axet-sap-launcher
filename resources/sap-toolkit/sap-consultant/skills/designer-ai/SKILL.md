---
name: designer-ai
description: >
  Design the OUTPUT LAYOUT of an e-Fatura / e-İrsaliye (UBL-TR) XSLT template or
  a SAP Smartform visually, instead of hand-editing XSLT. Ships e-Solutions'
  DesignerAI: one self-contained HTML file that renders XML+XSL to a live table,
  lets you add/remove rows and columns and bind cells to XML fields or SAP table
  fields, and writes every change back into the exact place in the XSL. Also
  carries the UBL 2.1 cac/cbc XPath reference the binding depends on. Use when a
  printed invoice, despatch note or payment form has to change shape. Triggers:
  e-fatura, e-irsaliye, eFatura, eIrsaliye, UBL, UBL-TR, XSLT, XSL şablonu,
  fatura tasarımı, çıktı tasarımı, Smartform, smartform tasarımı, NP4,
  DesignerAI, cbc, cac, InvoiceLine, DespatchLine, XML alanı.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(py:*), Bash(python:*)
---

# DesignerAI — e-Fatura / e-İrsaliye XSLT and Smartform layout designer

Changing what a printed invoice looks like means editing an XSLT template whose
tables, `xsl:value-of` bindings and image blocks are spread across a few thousand
lines. This tool renders the XML through the XSL, shows the result as an editable
table, and writes each visual change back **into the corresponding place in the
XSL** — not into a copy, not into a new file.

**Not an NTT skill in origin.** The tool belongs to the **e-Solutions** team; the
lead is **Eren Güney**. The kit carries a copy so a consultant does not have to
go and find it, and `tool/_meta.json` records which version, taken when, and from
what. Behaviour questions and feature requests go to e-Solutions, not to the kit's
support desk.

---

## When to use

- An e-Fatura or e-İrsaliye print layout has to change: a column added, a row
  removed, a logo placed, a field swapped for another UBL field.
- A payment Smartform (NP4) has to be shaped, or an existing one read back,
  edited and saved.
- You need the right UBL XPath for a field and do not want to re-read the XSD —
  `references/ubl-xsd.md` has the cac/cbc map.

**Not** for generating the XSLT from scratch, and not for anything that writes to
SAP. It is a browser tool: it touches no system, needs no connection, and
produces XSL text you then deliver the normal way.

---

## Running it

```
tool/designer.html
```

Double-click it, or open it in Chrome/Edge/Firefox. No install, no server, no
`.conn_adt`. CodeMirror loads from a CDN, so first use wants a network; after
that the file works offline.

Two document types across the top:

| Radio | What it designs |
|---|---|
| **eFatura/eIrsaliye** | The UBL XSLT template. XML + XSL editors on the left, live rendered table on the right. |
| **Smartform** | A payment Smartform fed by SAP tables (REGUH, LFA1, T001, BNKA, REGUD), with NP4 fetch/save. |

---

## The one rule that costs people an afternoon

**Visual edits are not in the XSL until you press “⚙ XSL Güncelle”.**

The rendered table is a preview. Row/column operations and cell edits change the
preview immediately and the XSL not at all; the button is what parses the XSL,
finds the header row and the `DataOfItems` template, and rewrites them. Close the
tab before pressing it and the work is gone — the tool holds no document, it
holds two editor buffers.

So the loop is: edit visually → **XSL Güncelle** → copy the XSL out.

---

## Binding a cell

“Hücre Düzenle” offers two kinds, and the difference is the whole point:

- **Sabit Metin** — literal text, written into the XSL as text.
- **XML Alanı (CBC)** — a UBL field, written as `<xsl:value-of select="..."/>`.

The tool tells them apart when reading an existing XSL the same way: a cell whose
XSL starts with `xsl:value-of` is a field, anything else is literal. That is why
hand-editing the XSL between sessions can confuse it — keep the round trip inside
the tool.

**Pick the XPath from `references/ubl-xsd.md`, not from memory.** The trap there
is `cac:` versus `cbc:`: a `cbc:` element holds a value and can be bound
directly, a `cac:` element is a container and binding it renders nothing, with no
error. The root is `//n1:Invoice/...` for invoices and `//n1:DespatchAdvice/...`
for despatch notes.

Images (logo, barcode, QR) come from
`cac:AdditionalDocumentReference[cbc:DocumentType='BARCODE']/cac:Attachment/cbc:EmbeddedDocumentBinaryObject`.
An oversized image is auto-fitted to 250×250 px and can then be resized by
dragging.

---

## Smartform side (NP4)

Cells bind to **SAP table fields** rather than XML: pick the table, then the
field. “🔄 Getir” loads an existing design by name, “💾 Kaydet” stores the current
one under a new name, and the payment-document picker fills every bound cell with
one document's data so the layout can be judged against real-shaped values.

> **The NP4 connection is a front-end simulation.** `fetchSmartformFromNP4` and
> the save handler read and write an in-memory `Map` plus a mock catalog — no
> HTTP leaves the browser. Designs do **not** persist: close the tab and a saved
> smartform is gone. Upstream's own note says the real NP4 OData/RFC service has
> to be wired in once its base URL and authentication are settled. Until then,
> treat Smartform mode as a layout sketchpad and carry the result over by hand.

The demo catalog ships under neutral `ZDEMO_*` names. The upstream copy had a
customer's real smartform and namespace in it; `scripts/sync_designer.py`
substitutes them on every import, so do not hand-edit `tool/designer.html` —
the next refresh would overwrite it and the scrub would be the only thing
protecting the names.

---

## Refreshing the copy

Maintainer-side, on the release cycle:

```bash
py scripts/sync_designer.py --source "<path to e-Solutions DesignerAI>"
```

It re-imports `index.html` and `UBL_XSD_YAPISI.md`, applies the customer-name
scrub, refuses if a scrub rule stopped matching or if a customer-shaped
identifier survives, and rewrites `tool/_meta.json` with the upstream sha256 and
the date.

Not on every upstream edit: `catalog_version` follows content, so each refresh
rewrites this skill on every consultant machine.

---

## Files

- `tool/designer.html` — the tool (single file; open in a browser).
- `tool/_meta.json` — source, owner, import date, upstream sha256, what was scrubbed.
- `references/ubl-xsd.md` — UBL 2.1 cac/cbc namespaces and the XPaths for invoice
  lines, despatch lines, parties, totals, tax and attachments.
- `scripts/sync_designer.py` (repo root) — the maintainer-side re-import.
