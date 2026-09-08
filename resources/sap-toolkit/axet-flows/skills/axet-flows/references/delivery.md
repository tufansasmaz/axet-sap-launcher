# Getting the result out

Most flows end in a file nobody opens. This is the other half: the shapes that put a
result in front of a person, and the rules each one enforces without saying so.

## Excel: `json-to-excel`

One contract, entirely inside `msg.payload.data`:

```javascript
msg.payload = {
  data: {
    "Critical stock": [                       // key -> sheet name
      { "Material": "M-1001", "Stock": 0 },   // element -> row
      { "Material": "M-1002", "Stock": 8 }    // keys    -> columns
    ]
  }
};
```

Columns are the union of the row keys on that sheet. The header row is generated; do
not write it yourself. Output is a **Buffer** on `msg.payload`, ready for the `file`
node — with **`Encoding = none`**, or the buffer is stringified and the workbook is
corrupt.

A cell can be five things:

| type | example |
|---|---|
| text | `"M-1001"` |
| number | `42` |
| date | `new Date(...)` — default format `dd/MM/yyyy` |
| **formula** | `() => "=D2-E2"` — a zero-argument function |
| **styled** | `{ value: ..., style: { ... } }` |

**A formula is a function, not a string**, because that is how the node tells a formula
from text that happens to start with `=`. Two consequences:

- **A table with formulas cannot be static JSON.** JSON carries no functions, so the
  table has to be built in a `function` node. This is a design constraint, not a style
  preference.
- The formula needs the **Excel row number**, not the array index. The header occupies
  row 1, so element `i` is row `i + 2`:

```javascript
const rowNo = rows.length + 2;
rows.push({ "Diff": () => "=D" + rowNo + "-E" + rowNo });
```

**Styles come from `xlsx-populate`, not from this node.** The key for a background fill
is **`fill`**, not `backgroundColor`, and colours are six hex digits with **no `#`**:

```javascript
{ value: "CRITICAL",
  style: { bold: true, fontColor: "9C0006", fill: "FFC7CE",
           numberFormat: "dd.MM.yyyy" } }
```

A wrong key is at least loud: `_Style.style: 'backgroundColor' is not a valid style`.
When unsure of a key, try it and read the error.

`Write into = Existing workbook` writes onto an `.xlsx` read with `file in` — the way
to fill a corporate template rather than generate a bare grid.

Verify without opening Excel — an `.xlsx` is a zip:

```bash
py -c "import zipfile,re; z=zipfile.ZipFile('report.xlsx'); print(re.findall(r'<f>([^<]+)</f>', z.read('xl/worksheets/sheet1.xml').decode()))"
```

And put a row in the sample data that the filter **must** drop. It is the cheapest
proof the filter runs at all.

## Run history: JSONL

`sql-query` is the natural home for this and often is not available (see
`node_catalog.md`). The substitute is one JSON object per line, appended to a file:

```javascript
msg.payload = JSON.stringify({ date, source: msg.source || "manual", critical: n });
msg.filename = "/internal-storage-files/report/run-history.jsonl";
```

`file` node: **Action = append to file**, **Add newline** on. The single rule of JSONL
is that a record contains no newline — call `JSON.stringify` without indentation and it
holds.

Reading back, `file in` hands you the whole file as one string:

```javascript
const records = raw.split("\n").map(s => s.trim()).filter(Boolean)
  .map(s => { try { return JSON.parse(s); } catch (e) { return null; } })
  .filter(Boolean);
```

The `try/catch` is load-bearing. If the container stops mid-write the last line is
truncated — and **that is why JSONL rather than one big array**: a broken line loses
only itself. A single JSON array would make the whole history unreadable.

Moving to `sql-query` later replaces this one node and nothing else.

## E-mail: `ms-graph-mail-send`

Everything goes in `msg.payload`:

```javascript
msg.payload = {
  subject: "Critical stock report -- 29.08.2026",
  toRecipients: [{ emailAddress: { address: "someone@example.com" } }],
  importance: counts.CRITICAL > 0 ? "high" : "normal",   // low | normal | high
  body: { contentType: "html", content: html },
  attachments: [{
    "@odata.type": "#microsoft.graph.fileAttachment",
    name: "critical-stock-20260829.xlsx",
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    contentBytes: buffer.toString("base64")
  }]
};
```

Base64 in both directions: a form upload arrives as base64 and an attachment leaves as
base64, because that is how binary travels inside JSON.

Two habits worth the two lines: **tie `importance` to the data** rather than fixing it,
and **put the date in the file name**, or the inbox accumulates thirty files with the
same one.

Config node prerequisites, and the DELEGATED permission that may block you entirely:
`node_catalog.md`.

## Recipients and endpoints: the `secret` node

The list of who gets the mail does not belong in the flow file. A `secret` node with
`Property = recipients` puts the value on `msg.recipients` at run time and keeps it out
of the export:

```javascript
toRecipients: String(msg.recipients || "")
  .split(",").map(a => a.trim()).filter(Boolean)
  .map(a => ({ emailAddress: { address: a } }))
```

## Scheduling and provenance

`inject` with Repeat = *at a specific time* takes cron: `30 7 * * 1-5` is 07:30, Monday
to Friday.

Wire **two** triggers into the same chain — a manual one and the scheduled one — and
have each set a different value in its `props` (`msg.source = "manual"` /
`"scheduled"`). Write that into the run history. "Was this report triggered by hand or
did it arrive on its own" is asked constantly and is unanswerable afterwards otherwise.

## Branch independence

Wire the node that produces the result to **both** the delivery branch and the archive
branch, rather than chaining archive behind delivery. Then a mail failure still leaves
the Excel written and the run recorded, and the `catch` node logs the failure without
stopping anything else. This is a wiring decision, and it is the difference between
"the report did not arrive" and "there is no report".
