# Integration technical detail — the PO/CPI team's sheet

The integration team (SAP PO / Cloud Integration) works from a one-sheet form,
*Entegrasyon Teknik Detay*: how the service is triggered, how often and how much, its
timeout, the source and target systems with their connection methods, sync or async,
request and response samples, and the other system's documentation. Until 2026-10-09
nobody asked those questions while writing the TS, so the integration team asked them
again, later, of people who had already answered half of them in the FS.

This skill now asks them **in the same STEP 4 round** and writes the sheet **beside the
TS**, as its own file: the TS is read by the ABAP developer, the sheet by the integration
team, and each approves its own. Every project, every integration development.

## When

The sheet is written when STEP 2 finds an integration, any of:

- development type **Interface** (the I of WRICEF);
- the FS names a middleware (PO, PI, CPI, Integration Suite, BTP integration) or a
  connection method: IDoc, Proxy, REST, SOAP, OData consumed by another system, RFC
  called from outside, file transfer (FTP/SFTP), a database link;
- a project brief that says so.

A development with an interface **and** ABAP work (an IDoc exit, a proxy class, a
BAdI that sends) gets **both**: the full TS for the ABAP part, the sheet for the
integration part. §2.1 lists the ABAP objects; the TS's integration section names the
sheet (`Entegrasyon detayı: <WRICEF_ID>-Entegrasyon-Detay.xlsx`) instead of repeating it.

### Integration-only (no ABAP object)

A pure middleware flow — CPI from a SaaS to a third party, nothing built in SAP — has no
Object List, no Clean Core decision and no ABAP logic: a five-part TS would be five parts
of "not applicable". Then, and only when STEP 2 found **no** object to create or change in
SAP:

1. Say so in one line: *"Bu geliştirmede SAP tarafında nesne yok; TS yerine entegrasyon
   detayını yazıyorum."* — and let the person disagree.
2. Ask only the sheet's questions (below) plus the FS's open items. Skip STEP 3 (Clean
   Core) and the naming standard: there is nothing to name.
3. Write the sheet, its Field Mapping sheet, and nothing else. No Part 1–5, no merge.
4. Approval and the project store as for a TS (`--kind TS`, the .xlsx as the file).

If the answers then show an SAP object after all (an iFlow that calls a BAPI that does not
fit, a custom IDoc type), stop and go back to the full TS — say so, do not stretch the sheet.

## The questions

Into STEP 4's ONE numbered list, **after** the TS questions, under their own heading
(*Entegrasyon detayı*). What the FS or the brief already answers is **not asked**: it is
shown as a line to confirm (*"FS'ten: kaynak sistem SAP S/4, IDoc ile — doğru mu?"*).

| key | field | ask / derive |
|---|---|---|
| `source_system`, `target_system` | source system (the one that triggers) and target | from the FS; confirm |
| `source_method`, `target_method` | connection method, each side: file transfer (FTP/SFTP), Database, IDoc, Proxy, REST, SOAP, RFC, other (say which) | from the FS when named; ask otherwise |
| `sync` | synchronous (a response comes back) or asynchronous | from the FS when a response is described; ask otherwise |
| `trigger` | instant (event), scheduled job, manual | ask unless the FS says |
| `frequency` | triggers per day (*"günde 3 kez"*, *"saatlik"*, *"anlık, günde ~500"*) | **ask** |
| `volume` | expected size per message or file (*10 MB*), and peak | **ask** |
| `timeout` | how long the caller waits | **ask** (sync); async: the retry window |
| `request_sample`, `response_sample` | an example payload with its fields | from the other system's documentation if given; else build it from §2.9 Data Mapping as `proposal` |
| `partner_docs` | the other system's technical documentation (name, version, link) | ask |
| `service_id`, `integration_id`, `app_link` | ids and link in the integration team's registry | **optional** — ask once, as *"varsa"*; not every project keeps them |

The additional block — the integration team's review asks these anyway, so ask them now:

| key | field | ask |
|---|---|---|
| `auth` | Basic, OAuth 2.0 (which grant), client certificate, API key | ask |
| `error_handling` | what happens on failure: retry (how many, how far apart), who is told, is the message kept | ask; a sensible default may be proposed |
| `monitoring` | where a failure is seen (CPI monitor, SAP AIF, an e-mail alert) | ask |
| `endpoints` | the address per environment, DEV / QA / PRD | ask; unknown is fine — `open` |
| `personal_data` | does the payload carry personal data (KVKK)? which fields | ask; it decides masking in logs |

## Writing the sheet

Every field gets a **source**, and the source is the honest one:

- `fs` — read in the FS; `ts` — decided in this TS; `user` — the person said it in the interview;
- `proposal` — derived by you (a sample payload built from the mapping, a default retry) and
  **not** confirmed: the sheet shows it on a warm fill, and it goes on the briefing's
  decision list;
- `open` — nobody knows yet. Never fill a guess to make the sheet look complete.

Write the answers to `<output_dir>/<WRICEF_ID>-Entegrasyon-Detay.json` (shape in the
script's header) and render:

```bash
py <SCRIPTS>/integration_sheet.py <WRICEF_ID>-Entegrasyon-Detay.json <WRICEF_ID>-Entegrasyon-Detay.xlsx --lang <tr|en>
```

`--lang` is the document's language, the same as the TS's (`references/DOCUMENT_LANGUAGE.md`,
table *Integration technical detail*). The payload samples are written as given — JSON,
XML or a field list — never translated.

The **Field Mapping** sheet comes from §2.9 Data Mapping: source field, target field,
type, required, transformation rule. Integration-only: build it from the FS and the
partner documentation; a row nobody confirmed is a `proposal` in the rule column.

## In the briefing (STEP 7)

One more result line: *"Entegrasyon detayı: N alan dolu, M öneri, K açık"* (the script
prints the counts). Every `proposal` and `open` field joins **SENİN KARARIN GEREKEN N NOKTA**
with its field name. If the TS and the sheet disagree (sync in one, async in the other; a
method the TS does not build), that is a defect to fix before the briefing, not a note.
