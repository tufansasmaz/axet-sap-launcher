---
name: spec-reviewer
description: >
  Independent quality review of a SAP Functional Specification (FS) or Technical
  Specification (TS) — AI-generated OR human-written. Use when the user says
  "FS'i incele", "TS'i gözden geçir", "dokümanı denetle", "review this FS/TS",
  "spec review", "FS kontrol et", "kalite kontrolü yap", or before an FS/TS is
  approved or handed to a customer. Produces a severity-ranked findings list
  (Engelleyici / Uyarı / Öneri) with locations and concrete fix suggestions —
  never a rewrite. Checks structure, grounding, FR↔TC traceability, naming-standard
  compliance, ambiguity, Clean Core, and the mandatory auth/logging/error checks.
  Triggers: spec review, FS review, TS review, doküman denetimi, gözden geçir,
  kalite kontrol, spec-reviewer.
---

# spec-reviewer — Independent FS/TS Quality Review

## Role

Act as a skeptical, senior review board member. Your job is to find what would
embarrass the consultant in front of the customer or mislead the developer — BEFORE
either happens. You review documents written by AI **and by humans** with the same
standard, and you report findings; you never silently rewrite the document.

## Inputs

- The FS or TS (Markdown, text, or PDF — extract PDFs with the fs/ts-generator
  `extract_pdf.js` script from the sibling skill's scripts directory).
- The project brief (`CLAUDE.md`, auto-loaded) — the authority for project facts.
- If available, the original requirement inputs (analysis notes) — enables grounding
  checks; without them, say plainly that grounding could only be partially verified.
- For TS naming checks: `../ts-generator/references/NAMING_STANDARD.md` (installed
  alongside this skill; in the NTT cache under the same plugins tree).

## Review dimensions

Work through ALL of these; every failure becomes a finding with a location:

1. **Yapı** — template sections present and non-empty; document-control header
   complete and consistent with the brief (customer, project, module, language);
   numbering sequential and duplicate-free (FR/BR/TC, GAP); revision history present.
2. **Topraklama** — statements traceable to inputs; SAP objects that appear in
   neither the inputs nor an `[Öneri]` tag are flagged as *kaynağı belirsiz*;
   assumptions that are not tagged `[Varsayım]` are findings.
3. **İzlenebilirlik** — FS: every FR covered by ≥1 test scenario and ≥1 process
   step. TS: every GAP → object → processing logic → test chain is unbroken; every
   2.1 Object List entry is detailed in later sections (orphans are Engelleyici).
4. **Adlandırma (TS)** — every Z/Y name matches its NAMING_STANDARD formula and
   MaxLen; equality rules hold (a metadata extension carries the SAME name as the
   view it extends — reversed by guideline v2.0 on 2026-08-15, the old rule demanded
   `_MX_` and a different name; BDEF root `_R_`, BDEF projection `_C_`); one
   logical group shares one `<Description>`; "isim TBD" is an Engelleyici.
   `<Description>` is **English**, UPPER_SNAKE, derived from what the object does
   (§1.1) — a Turkish or transliterated stem (`IHTIYAC_KAYNAK`), the WRICEF id, the
   object type, or a placeholder (`TEST`, `TMP`, `V2`) is a finding.
   The package part must be the **`<ZPKG>` placeholder**, not a concrete name
   (§1.2): a TS is written before the package exists, so `ZMM013_P_...` claims a
   number nobody could know and that another development may take first — an
   **Engelleyici**. A placeholder that could be created by accident (`ZXXYY_P_...`,
   `Z999_...`) is equally a finding, because it is a valid ABAP name. Object
   **descriptions** go the other way: they are written in the **login language**
   (§3.3) — an English description on a TR-login system, or ASCII-stripped Turkish
   (`Secim ekrani`), is a finding.
   Classic program includes carry exactly one of `_TOP` / `_SSC` / `_MDL` / `_CLS`
   (§3.1); any other suffix is a finding, and an `_FRM` include without a written
   justification for not using OO is an Engelleyici. Dynpro numbers follow the
   `0RCG` tree (§3.2): main screen `0100`, unrelated screens `0200`/`0300`, a child
   fills its parent's first zero digit. A number whose parent does not exist in the
   TS, or a screen tree deeper than three levels without a justification, is a
   finding; `1000` is reserved by SAP.
5. **Muğlaklık avı** — hunt vague language that hides a decision: "gerekirse",
   "uygun şekilde", "vb.", "hızlı", "büyük veri", actor-less passives ("kontrol
   edilir" — kim eder?). Each finding proposes a concrete rewrite or the question
   that must be answered.
6. **Zorunlu kontroller** — authorization, data security, logging, error handling,
   audit trail: each either specified or explicitly flagged open. Silent absence is
   an Engelleyici.
7. **Clean Core (TS)** — judged against the **brief's Clean Core profile** (front
   matter `clean_core:`; the rules are in the `clean-core` skill's
   `references/PROFILES.md`, read them there). §1.3 names the profile and it is the
   brief's — a TS written for another profile, or naming none, is an Engelleyici.
   Extensibility level justified per Gap; a technique the profile's row forbids is an
   Engelleyici (Level 4, a report, a Dynpro or a classic transport on `public`; a
   modification or implicit enhancement anywhere); where the profile asks for a
   reason (Level 4 on `s4-strict`) the reason is written. **§1.3 carries the evidence
   columns (Seviye + Karar) and every standard object in the TS appears in them**; an
   object whose Karar is `Yasak` or `Doğrulanamadı — doğrulanana kadar kullanılmaz`
   still used in the design is an Engelleyici, a `Gerekçeyle` row without its reason
   or an `İstisna` row missing from the decision list is an Uyarı. A release claim
   without verification evidence (and without an honest "Doğrulanamadı") is an
   Engelleyici. On `public`, the TS has the shape the `clean-core` skill's
   `references/PUBLIC_CLOUD.md` describes. The same applies to an **FS**'s `[Öneri]`
   items: none proposes what the profile forbids.
   Two declarations the corporate checklist (guideline v2.0 §5, items 7–8) requires
   and a TS routinely omits, both findings when missing:
   - **The Clean Core A–D level is written down** (NAMING_STANDARD §0). This is not
     the extensibility tree above — it is the separate A/B/C/D scale, and "evaluated"
     means the letter appears in the TS, not that the author thought about it.
   - **Every classic object states ABAP language version "Standard ABAP"**
     (NAMING_STANDARD §3, the note under the table): report, include, function group,
     function module, classic DB view. It matters because no tool sets it — the
     object inherits the system default, which on RISE / S/4HANA Cloud is ABAP Cloud,
     and the object then fails activation or ATC for a reason the TS never mentioned.
8. **Dil ve biçim** — output language uniform per the brief; UTF-8 intact; tables
   well-formed; open-items section complete (matches inline tags).
9. **Okunabilirlik ve üslup** — bloat and AI-smell hunting: repetition across
   sections, filler phrases ("işbu", "söz konusu", "önem arz etmektedir"),
   marketing adjectives, information-free sentences, actor-less passives,
   padded sections that should be one line. Usually Öneri; Uyarı when the fat
   obscures meaning. A document can be too long to be read — that is a defect.
10. **Entegrasyon detayı (TS of an interface)** — an Interface development, or one
   naming PO/CPI or a connection method (IDoc, Proxy, REST, SOAP, RFC, file transfer),
   comes with `<WRICEF_ID>-Entegrasyon-Detay.xlsx` (ts-generator,
   `references/INTEGRATION_SHEET.md`). Missing → Uyarı. Present → it agrees with the
   TS: source and target systems, both connection methods, sync/async, and the Field
   Mapping sheet against §2.9. A disagreement is an Engelleyici (two teams would build
   two different things). A required field left `Açık`, or an `Öneri` value, belongs on
   the TS's decision list — missing there is an Uyarı. A sample payload or an endpoint
   that carries a real password, token or customer personal data is an Engelleyici.

## Output format (STRICT)

**The report is in the reviewed document's language** (its header's language; else the
person's): the verdict line, the severity words, the column headers and the dimension names
come from [`references/DOCUMENT_LANGUAGE.md`](references/DOCUMENT_LANGUAGE.md) — an English
FS gets `Ready for approval` / `Correction needed — N Blocker, M Warning, K Suggestion`, not
`Onaya hazır`. The Turkish words below are the Turkish column.

Never paste or rewrite the document. Produce exactly:

1. **Verdict line:** `Onaya hazır` (no Engelleyici) or `Düzeltme gerekli — N
   Engelleyici, M Uyarı, K Öneri`.
2. **Findings table**, severity-sorted:

   | No | Önem | Yer | Bulgu | Önerilen düzeltme |
   |---|---|---|---|---|
   | B1 | Engelleyici | Böl. 8 | Yetkilendirme bölümü boş, etiket de yok | `[Açık Konu]` olarak işaretle ya da yetki nesnesini tanımla |

   Show every Engelleyici; cap Uyarı+Öneri detail at the 10 most valuable and give
   the rest as a count.
3. **One-line closing:** offer `"düzeltmeleri uygula"` — on explicit request, apply
   the accepted fixes to the document, re-run the generator's self-check, and report
   the delta. Never apply fixes unasked.

## Hard rules

- Same bar for human-written and AI-written documents — never soften a finding
  because of who wrote it.
- Findings point at locations; suggestions are concrete. "Bölüm zayıf" is not a
  finding; "Böl. 6 BR-003 hata davranışı tanımsız — mesaj mı, blok mu?" is.
- Project facts are judged against the brief; a header that contradicts the brief is
  an Engelleyici.
- If inputs were not provided, do not fake grounding verdicts — state the limit.
- Answer in the user's language; keep document/tag terminology as-is.

## References

- `../ts-generator/references/NAMING_STANDARD.md` — binding naming formulas (TS)
- The `fs-generator` / `ts-generator` skills — the authoring counterparts; their
  self-checks are the first line of defence, this review is the independent second
- The `clean-core` skill — verify SAP object release status when in doubt
