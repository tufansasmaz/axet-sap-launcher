---
name: dev-walkthrough
description: >
  Use when an ABAP developer must UNDERSTAND a development well enough to revise it
  — because an AI agent wrote most of it, or someone else did. Three triggers: (1) the
  developer hands over a TS and wants it analysed before anything is built; (2) a
  piece of work has finished and they want to understand what was built, how it
  runs and where a change would land; (3) they name one package, several packages
  or developments to learn. Reads the system, writes a plain walkthrough with a
  revision guide, and can quiz the developer on it. Triggers: "anlat", "ne yaptık",
  "nasıl çalışıyor", "revizyon için hazırla", "paketi anlat", "TS'i analiz et",
  "explain this development", "walk me through", "where would I change". NOT the
  signed handover document (as-built-doc), NOT writing a TS (ts-generator), NOT release
  readiness (abap-code-checker), NOT why something broke (sap-incident).
author: "NTT DATA SAP kit"
---

# dev-walkthrough — so the developer can still change what exists

Code written with an agent leaves the developer holding objects they cannot map: when a
revision arrives they do not know which object, table or decision it touches. This skill
rebuilds that map **from the system, not from memory**, and then checks that it stuck.

It **explains and changes nothing**: no code edit, no SAP write. It reads through the
`sap-adt` tools (reading is enough).

> **NTT Studio uyarlaması — MCP değil, HTTP.** aXet.code MCP konuşamıyor; `adt_*`
> araçları yerel bir HTTP sunucusundan çağrılır: aşağıda `adt_xxx` denen her yerde
> `POST $ABAP_HTTP_URL/tool/adt_xxx` (yoksa `http://127.0.0.1:8787`), başlık
> `Authorization: Bearer $ABAP_HTTP_TOKEN` oku. Ayrıntı ve örnek çağrı `sap-adt` /
> `sap-adt-readonly` SKILL.md'sinin başında. Bu skill'in kullandığı okuma araçları
> (`adt_get_source`, `adt_list_package`, `adt_where_used`, `adt_sql`, ...) iki yüzeyde de
> açık; buradan hiçbir yazma aracı çağırma.

## 1 · Which situation

Ask one line only when it is not clear: *this TS / this finished work / one package /
several?*

| Situation | Source | The walkthrough covers |
|---|---|---|
| **A · a TS, nothing built yet** | the TS the developer gives; the project brief | what it asks for, the planned flow, planned objects, open points |
| **B · finished work** | the objects named in this conversation, or a transport (`adt_sql` on `E071`) | all sections below |
| **C · one package** | `adt_list_package` | all sections |
| **D · several packages or developments** | each as C | all sections per unit, then what they share |

## 2 · Read the system, then write

**The conversation is not evidence.** For B especially — when the agent wrote the code in
this session — re-read the objects **now**: they may have changed since, or someone else
wrote them. `adt_get_source` filtered with `method=` or `grep=`, never a whole class
(three unfiltered class reads end the session).

Save what you read to `docs/walkthrough/<scope>/veri/nesneler.json` (the object list,
`[{"type","name","text"}]`) before writing. The walkthrough goes to
`docs/walkthrough/<scope>/anlatim.md`. Tell the developer it lives in the project folder.

## 3 · What the walkthrough holds

Plain Turkish unless the project says otherwise (headings in
[`references/STRUCTURE.md`](references/STRUCTURE.md), with the English set). No metaphors;
every sentence carries a fact; technical names exactly as the system spells them.

1. **What it does** — the business purpose in two or three sentences.
2. **Flow** — step by step, each step with the object that runs.
3. **Objects** — a table: object, what it is for, who calls it, what it reads and writes,
   what breaks if it changes.
4. **Data** — tables read, tables written, key fields.
5. **Decisions** — what was decided, why, by whom, from which TS item. No source → write
   `[BİLİNMİYOR]`, never invent one.
6. **Revision guide** — the centre of the document: *"if X is asked, these objects, tables
   and tests are affected"*, one row per likely change. See `STRUCTURE.md`.
7. **Unknowns** — what could not be read and who can say.

Mark what you could not read `[BİLİNMİYOR]` and what you worked out from code
`[ÇIKARIM]`. A real customer record number, name or material never goes in; use an
obvious test value and a role instead of a person.

## 4 · Check it mechanically

```bash
py <SCRIPTS_DIR>/check_walkthrough.py docs/walkthrough/<scope>/anlatim.md \
   --evidence docs/walkthrough/<scope>/veri/nesneler.json [--ts <ts.md>] [--allow ZQM016 ...]
```

Every section present, and every `Z`/`Y` name in the text is in the evidence, the TS or
`--allow` — an invented object name is the commonest fault here. Situation A:
`--ts-only --ts <ts.md>`. Exit 1 = fix it; exit 2 = not checked, never a pass.

## 5 · Offer to check understanding (optional, short)

Ask once: *"Birkaç soruyla yoklayayım mı?"* If yes: three to five questions, **drawn only
from the Revision guide table**, one at a time — *"X istenirse hangi nesnelere dokunursun,
hangisine dokunmazsın?"*. Grade against the table, not against your memory. On a miss, point
at the walkthrough line that answers it; no lecture. Nothing is kept about the person: no
score, no record.

## 6 · Boundaries

- Explains an existing or planned development. The signed handover document is
  `as-built-doc`; writing the TS is `ts-generator`; "can this be released" is
  `abap-code-checker`; "why did it break" is `sap-incident`.
- No write to SAP, no code change. If the developer then wants a change, that is their
  next request.
- Names are judged against the project's naming standard only when asked — this skill
  explains what exists.
