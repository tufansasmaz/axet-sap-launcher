---
name: sap-adt
description: >
  SAP ABAP development AND read-only analysis via SAP ADT REST API. Use when
  working with ABAP classes, interfaces, programs, CDS views, DDIC objects
  (domains, data elements, structures, tables), transports, packages, or any SAP
  development task — and equally for ANALYSIS questions: reading/summarizing
  existing code, profiling a table, previewing data, where-used / impact analysis,
  understanding an as-is process from code (e.g. before writing an FS). Handles
  connection checks (logon), .conn_adt configuration, SQL queries, ATC checks and
  object activation. Triggers: ABAP, SAP, ADT, transport, CDS, DDIC, .conn_adt,
  S/4HANA, clean core, RAP, Fiori, "tabloyu incele", "veriyi göster", "kodu oku",
  "bu program ne yapıyor", "nerede kullanılıyor", "as-is analiz", "SAP'ye bağlan".
  In NTT Studio (aXet.code) the adt_* tools are NOT MCP tools: they are called over
  HTTP at http://127.0.0.1:8787/tool/<name>, which NTT Studio starts on connect. An
  empty adt_* tool list does NOT mean SAP is unreachable.
allowed-tools: Bash(python:*), Bash(cd:*), Read, Write, Edit, Grep, Glob
---

# SAP ADT Skill

> **NTT Studio uyarlaması — MCP değil, HTTP.** Bu dağıtımda MCP yok; aXet.code MCP
> konuşamıyor. Bu yüzden araç listende `adt_*` diye bir araç **görmeyeceksin** — bu
> "SAP'a bağlı değilim" demek DEĞİL. NTT Studio sisteme bağlanırken ADT sunucusunu
> kendisi başlatıyor: `http://127.0.0.1:8787`. Aşağıda `adt_xxx` MCP aracı denen her
> yerde `POST http://127.0.0.1:8787/tool/adt_xxx` oku (JSON gövde = aracın argümanları).
>
> - **Çoklu sistem:** NTT Studio aynı anda birden fazla sisteme bağlı olabilir; her
>   sistemin sunucusu kendi portunda ve kendi jetonuyla. Bu süreçte doğru adres
>   `$ABAP_HTTP_URL` (ortamda; yoksa `http://127.0.0.1:8787`), jeton `$ABAP_HTTP_TOKEN` —
>   ikisi de çalışma klasörünün sistemine ait. Aşağıda 8787 yazan her yerde bu adresi
>   kullan; `sap-context.md` bu sistemin gerçek portunu yazar. Başka sistemin portunu
>   deneme: jetonun onu açmaz (401).
> - Her istekte `Authorization: Bearer $ABAP_HTTP_TOKEN` gerekiyor, `/health` dahil.
>   Token ortamda duruyor; değerini ekrana basma, hiçbir dosyaya yazma.
> - İlk iş `GET /health`: `tools` listesi o an hangi yüzeyin ayakta olduğunu söylüyor.
>   DEV'de 67 araç (`adt_push`/`adt_activate` ve onay araçları dahil); diğer sistemlerde 30, yazanlar
>   `404 unknown_tool` döner. Hangisinin açık olduğunu varsayma, sor.
> - `adt_edit_source` ve `adt_edit_method` NTT Studio'da **hiç açılmıyor** (DEV'de de
>   `404 unknown_tool`): kaynağı motorun geçici dosyasında düzenleyip push ediyorlar,
>   inceleme kaydı o dosyayı göremez. Yol: `adt_get_source` → dosyada düzenle →
>   `abap-code-review` → `adt_push(source_file=...)`. Sınıfın yerel include'u
>   (`adt_write_class_include`) açık ve onaylı; inceleme kaydına include dosyasını da koy.
> - Sunucuyu kendin başlatma, `adt_mcp_server.py`'yi doğrudan çalıştırma: ikinci süreç
>   ikinci SAP oturumu demek. Durum için proje klasöründeki `sap-context.md`'ye bak;
>   `/health` cevap vermiyorsa kullanıcıdan NTT Studio'da sisteme yeniden bağlanmasını iste.
> - Aşağıdaki "8787 writes, 8790 is read-only" notu burada geçerli değil: NTT Studio iki
>   yüzeyden hangisini açtıysa 8787'de o var. `.mcp.json`, `ABAP_PYTHON`,
>   `/reload-plugins` ve "MCP server'ı yeniden başlat" anlatan bölümler Claude Code
>   içindir, burada uygulanmaz.
>
> ```bash
> python -c "import os, requests; h={'Authorization': 'Bearer ' + os.environ['ABAP_HTTP_TOKEN']}; print(requests.get(os.environ.get('ABAP_HTTP_URL', 'http://127.0.0.1:8787') + '/health', headers=h).json())"
> python -c "import os, requests; h={'Authorization': 'Bearer ' + os.environ['ABAP_HTTP_TOKEN']}; print(requests.post(os.environ.get('ABAP_HTTP_URL', 'http://127.0.0.1:8787') + '/tool/adt_logon', json={}, headers=h).json())"
> ```

> **NTT Studio uyarlaması — SAP DEV yazma onayı.** DEV'de 8787'deki sunucu motorun
> kendisi değil, onu saran onay katmanı (`adt_gated_server.py`). Okuyan araçlar olduğu
> gibi çalışır; SAP'a yazan her çağrı NTT Studio'da kullanıcının önüne bir onay
> penceresi açar. Aşağıdaki "confirm the transport with the user" kuralları geçerli,
> pencere onların yerine geçmiyor — üstüne ekleniyor.
>
> - **Çalışma modunu kullanıcı seçer** (oturum başına): doğrudan DEV'e yazmak ya da
>   önce yerelde çalışıp sonra teslim etmek. Seçilmemişse yazma `mod_secilmedi` döner;
>   kullanıcıdan NTT Studio'da seçmesini iste, modu sen seçme.
> - `approval_pending` → kullanıcıya NTT Studio'daki onay penceresini söyle; onayladıktan
>   sonra **aynı çağrıyı aynı argümanlarla** tekrar gönder. Argümanı değiştirirsen bu yeni
>   bir yazmadır ve yeni pencere açar.
> - `approval_denied` → dur. Aynı işi başka araçla, kabuktan ya da SAP GUI'den dolanarak
>   yapmaya kalkma; kullanıcıya ne istediğini sor. `approval_unavailable` → NTT Studio'ya
>   ulaşılamıyor: onay yoksa yazma yok, kullanıcıya NTT Studio'nun açık olduğunu sor.
> - `yerel_mod` → bu oturum yerelde çalışıyor. `src/` altında geliştir; iş bitince
>   `axet_teslim` ile tek pencerede teslim onayı iste (`nesneler`, `paket`, `transport`;
>   abapGit için `yontem="abapgit"` ve `zip_dosyasi`), ardından aynı nesneleri aynı kaynak
>   dosyalarıyla ve aynı transport'la yaz — o çağrılar pencere açmadan geçer.
> - **Kaynak her zaman dosyadan:** `adt_push` ve kardeşlerine kaynağı satır içi `source`
>   olarak verme, dosyaya yaz ve `source_file` ile ver (`kaynak_dosyasi_gerekli`). Kalite
>   kapısı dosyanın hash'ini inceleme kaydıyla eşliyor.
> - **Kod yazan her işte önce `%abap-code-review`**, sonra `axet_inceleme_kaydet`.
>   `inceleme_yok` / `inceleme_eski` → incelemeyi bu kaynakla yeniden çalıştır.
>   `kritik_bulgu` **kesin engel**: aşma yolu yok; kodu düzelt, yeniden incele, yeniden kaydet.
> - `transport_belirsiz` → transport'u kullanıcıya sor (`adt_list_transports`). Paket adını
>   asla tahmin etme.
> - Başarılı bir yazmanın cevabında `axet_atc` (ATC özeti) ve `axet_uyari` olabilir;
>   kullanıcıya ilet.
> - Sunucuyu elle başlatma: onay ucunun adresi yalnızca NTT Studio'nun başlattığı sunucuda;
>   elle açılan sunucu her yazmayı reddeder.
> - **SAP'a tek yazma yolu 8787'deki bu sunucu.** `references/` ve `DDIC_OBJECTS.md` içindeki
>   `POST/PUT /sap/bc/adt/...` satırları motorun iç işleyişini anlatıyor, elle izlenecek
>   tarif değil. Proje klasöründeki `adt-tool.ps1` salt okunur (yalnızca GET/HEAD);
>   `.conn_adt`'deki parolayla kendi HTTP isteğini kurma. Kademeyi NTT Studio veriyor;
>   `.conn_adt`'deki `ADT_SAP_TIER` onu yalnızca daha kısıtlayıcı yöne çekebilir.

SAP ABAP development and analysis through the ADT REST API. **Every SAP operation goes
through the MCP tools (`adt_*`)** — one long-lived server, one persistent authenticated
session. There is no parallel CLI path (v1.3.0+); anything that says `python
push_object.py …` is a stale doc (see "Archived CLI" at the end of the tool palette).

## Architecture

```
adt_mcp_server.py  @mcp.tool   (ONE long-lived process; persistent SAPClient)
        |
sap_client.py   (high-level ops + guardrails)
        |
sap_adt_lib.py  (lock / PUT / activate / CSRF / cookies)
        |
SAP ADT REST API  (/sap/bc/adt/*)  ->  SAP system
```

The server keeps ONE `SAPClient` alive for the whole session — HTTP session,
`sap-contextid` cookie, CSRF token and lock handles persist across calls — and returns
typed `{ok, ...}` results. A class push is **atomic** within one tool call
(lock → PUT → activate → unlock), so session/lock state never drifts between calls.
All tools honor the same guardrails (`guardrails.py`: Z/Y namespace, `ADT_READONLY`).

Everything about transports — ghost transports, their root cause, the automatic guard,
recovery — lives in **Critical Rule 2** below. That section is the single source; do not
look for transport rules anywhere else in this document.

### Running the MCP server

Registered via `plugins/sap-consultant/.mcp.json`; Claude Code starts it automatically when the
plugin is enabled and the tools appear as `adt_*`. It needs `mcp` installed
(`pip install -r requirements.txt`) and resolves `.conn_adt` from `ADT_CWD` (set to the
project dir). **Interpreter:** the command is `${ABAP_PYTHON:-python3}`, expanded against
Claude Code's own process env.

> **0 `adt_*` tools after enabling the plugin?** The server launched under the wrong
> interpreter (usually the Windows-Store `python3` stub, which lacks `mcp`). Confirm by
> **calling `ping`** — don't trust an empty tool list. **Canonical fix:** add an `env`
> block to your **user-scope** `~/.claude/settings.json` (applies to every
> session/project/launch method, unlike `setx` or a project settings file):
> `{ "env": { "ABAP_PYTHON": "C:\\…\\.venv\\Scripts\\python.exe" } }` — an absolute path
> to a Python that has `mcp`. Full restart, re-probe with `ping`. Self-diagnose
> checklist: `docs/SAP_ADT_MCP_SERVER.md`.

> **Loading NEW server code** (after a plugin update or local edit): `/reload-plugins`
> does NOT reliably restart the running server process — it can re-bind to the old one.
> To guarantee new code is live: clear `__pycache__` under `skills/sap-adt/scripts/`,
> kill the `adt_mcp_server.py` process(es), then `/reload-plugins` or fully restart
> Claude Code. **Verify with `ping`** — it returns `version` + `install_path` and flags
> `stale_process` / `update_hint` itself. The plugin runs from the installed cache
> (`~/.claude/plugins/cache/...`), not the repo working copy. See
> `docs/abaper/ARCHITECTURE.md` §6.

### Read-only entrypoint — the `sap-adt-readonly` skill

For a system that must be unwriteable: a second entrypoint onto **this same engine**
that never registers the write tools (**27 tools instead of 65**; `ADT_READONLY` alone
is only a call-time belt). `adt_unit_test`, `adt_sql`, `adt_dumps` and `adt_spool_read` are additionally
gated behind individual opt-in variables. Surface table, rationale and fail-closed
matrix: [`../sap-adt-readonly/SKILL.md`](../sap-adt-readonly/SKILL.md).

> **If you add a tool to `adt_mcp_server.py`, classify it in the read-only allowlist
> too** — that server refuses to start on a tool it has never seen, by design, so an
> unclassified addition breaks it loudly rather than silently exposing a write.

### Local HTTP transport — for clients that can't speak stdio MCP

aXet.code reaches this engine over a local HTTP server on the SAME long-lived process
(no ghost risk). **8787 writes, 8790 is read-only**; the launcher starts it and records
`port` and `token` in `.axet-code/adt-http.json`. Every call needs
`Authorization: Bearer <token>`: `GET /health`, `GET /tools`, `POST /tool/<name>`.
**Probe `/health` before starting one** -- a second server is a second SAP session.
Starting it by hand, endpoints and the security rules:
[references/HTTP_TRANSPORT.md](references/HTTP_TRANSPORT.md).

---

## Not everything is ADT — routing to sibling skills

- **Classic Dynpro screens / GUI statuses / titlebars** (SE51/SE41 artifacts): ADT has
  NO endpoint for these — a 404 here does NOT mean "impossible". Use the **`screen-gen`**
  skill / `adt_generate_screen` tool (RFC-enabled generator FM over SOAP-RFC; one-time
  bootstrap documented there). Triggers: CALL SCREEN, PF-STATUS, SET TITLEBAR, ALV
  container, splitter, screen painter.

- **Adobe Forms / Adobe Interfaces (`SFPF`/`SFPI`)**: absent from ADT's supported-type
  list — read, write and create all fail. Not "impossible", just "not through ADT". Use
  the **`adobe-gen`** skill / `adt_generate_adobe` (same generator-FM pattern, wrapping
  SAP's own `SAFPAPI`; verified end to end on S/4HANA 2023). It also moves layouts (XDP)
  in and out, adds interface parameters and syncs the context tree — designing the
  layout stays human work in LiveCycle. **Never believe a bare success message on these
  objects:** ADT cannot display them, so there is no second opinion — verify with
  `--mode STATUS` after any write. Triggers: Adobe Form, PDF form, print/output form,
  çıktı formu, fatura çıktısı.

- **Message classes (`MSAG`)** — this skill's own `adt_message_class`: one call,
  `action="create"` with `messages=[...]`, creates the class and writes the texts;
  `action="write"` adds or changes texts later (read → merge → PUT → read back). The
  old "currently editing" refusal after a create is fixed (2026-11-11).
  **Always check the returned `language`:** blank means `T100-SPRSL` was not keyed and
  the texts never resolve at runtime, while SE91 looks perfectly normal.

## When a connection/write FAILS — interpret it correctly

**How a failure reaches you depends on the transport, and both shapes are correct.**
A tool that fails raises, so on **stdio MCP** the response is marked `isError` and the
text is the full JSON payload. On the **local HTTP transport** (a client that does not
speak MCP) the same failure arrives as HTTP 200 with that payload as the JSON body,
`ok: false` and all — there is no error channel a non-MCP client reads, so the body is
the channel. Either way you get the same fields: `error`, `message`, usually a `hint`,
and `error_source: "log"` when the cause was recovered from the tool's own output.

Before 2026-08-19 a failing tool could answer `ok: true`: in one measured run **26 of
64 calls reported success while failing**. If you are reading an older transcript, do
not trust its successes.

Four traps cost real debugging time and one nearly locked a SAP account. Read this
BEFORE concluding "SAP/Basis blocks this" — usually the cause is tooling state, not SAP.

- **`adt_*` tools missing / "MCP not loaded"** → the server failed to start (wrong
  interpreter — see "Running the MCP server" above for the `ABAP_PYTHON` fix). **Do NOT
  fall back to the archived CLI scripts and then draw conclusions about SAP** — a fresh
  process per call loses the stateful session and produces false
  `NO_LOCK_SUPPORT`/403 that look like a system lockdown.

- **`401` / "Authentication failed" that won't go away** → the MCP caches ONE client for
  its whole lifetime; after editing `.conn_adt` the running server still holds the OLD
  credentials. FIX: kill the `adt_mcp_server.py` process(es) (often TWO) +
  `/reload-plugins`, then `ping`. **Do NOT retry logon to "see if it works"** — each
  failure counts toward SAP's `login/fails_to_user_lock` (often 5) and the v1.5 circuit
  breaker will latch anyway. Verify the password independently with ONE
  `curl https://…/sap/bc/adt/discovery?sap-client=NNN` (200 = good).

- **`NO_LOCK_SUPPORT` / silent PUT / `403` on activate** → `NO_LOCK_SUPPORT` is a
  **catch-all**, not a system verdict: returned for a 404 lock endpoint, a stale
  same-user lock, and any other lock failure. CONFIRM with an MCP **`adt_push`** (atomic
  lock→PUT→activate in one stateful session, on a user-confirmed transport) before
  recommending SE24/SE80 or sapgui-scriptter. Only if the MCP push *also* fails is a
  system-policy conclusion justified.

- **`[500] ExceptionResourceSaveFailure` / "locked in request" on source-save — a
  `LIMU CPUB`/`CPRI`/`METH` E071K lock** (common on OLDER systems). Tell-tale: read,
  create, lock (real handle **and** a CORRNR) and delete all WORK — only the source PUT
  is refused, and the message names a **LIMU** sub-object. This is NOT a Basis lockdown:
  on older CTS, locking *with* `corrNr` (and/or the R3TR pre-registration) pre-locks the
  class includes in the request, which then blocks the PUT (proven live 2026-06-18).
  **Automatic fix (v1.4.11+):** `adt_push` catches this and retries the old-system path —
  re-lock **without** `corrNr`, then PUT with `corrNr` as a query parameter. If the
  fallback still fails (a genuinely stuck E071K from a prior interrupted edit):
  1. **SE03 → Transport Organizer Tools → "Unlock Objects (Expert Tool)"** → unlock;
     verify with `adt_transport_check`.
  2. Ensure the object is recorded as **`R3TR CLAS`** (whole class, not LIMU) — for an
     existing object that means **SE09 → Include Objects**. Then retry `adt_push`.

**Three identical failures on the same object: stop.** Report the error text and what was
tried. A fourth attempt with the same input changes nothing and can leave a lock or a
transport entry behind.
An error message you do not recognise: [`references/KNOWN_ERRORS.md`](references/KNOWN_ERRORS.md)
reads common ADT symptoms (412, 423, EU 510, "activated but not", false "not found").

## Project brief first (CRITICAL)

If the project root has a **`CLAUDE.md` project brief** (auto-loaded on NTT-managed
projects), it is the single source of truth for project facts:

- **Package & namespace:** the development package (e.g. `ZSD001`) and the `Z`/`Y`
  prefix come from the brief's namespace/package field — never from memory or from
  legacy examples in this document.
- **Landscape guard — verify BEFORE working:** the brief lists the system landscape
  (`DEV=<SID> · QA=<SID> · PRD=<SID>`). After logon, compare the connected system
  (URL/SID in the `adt_logon` output) against it:
  - Connected system ≠ the brief's DEV → **STOP and ask**, naming both sides:
    *"Reçete DEV=ABC diyor; bağlı olduğun sistem XYZ (QA görünüyor). Devam edeyim mi?"*
  - QA/PRD match → say so, and continue **read-only by default** — "Production
    systems" below is the single source for what that means and for how an explicit
    write gets approved if the user does want one.
  - Brief landscape empty or `[BİLİNMİYOR]` → one neutral note ("reçetede peyzaj
    tanımsız — lider doldurursa bu kontrol otomatikleşir"), then proceed.
- **Read-only pin is design, not failure:** on module-consultant installs the
  ntt-setup preamble pins `ADT_READONLY=true` — mutation tools refuse server-side.
  Never unset it, never retry around it; tell the user this project is read-only
  towards SAP and route changes to a technical consultant / the abapGit path.
- **What the brief does NOT govern:** transports (always listed live and confirmed
  with the user) and credentials (`.conn_adt` only).

## Production systems — read-only by DEFAULT (conduct, not a lock)

Nothing here forces read-only on a production system, and that is deliberate. **SAP
already decides this**: with the system change option set to *not modifiable* (SE06) and
the client locked against repository changes (SCC4) — the default on any well-run PRD —
the write path never opens in the first place. Where it *is* open, someone's Basis team
opened it on purpose. A tool that overrides that decision is a tool people work around,
so this is a rule of conduct for **you, the agent**, not a switch:

> On a production system, work read-only unless the user asks you — for that system — to
> write, and confirm once before you do.

### Establish which system you are on, before the first write

| what you have | what to do |
|---|---|
| a `CLAUDE.md` brief with a landscape | compare the connected SID/URL from `adt_logon` against it (see "Project brief first" above) |
| no brief, or an empty landscape | ask ONE question and believe the answer: *"Bağlandığın sistem üretim mi (PRD), yoksa geliştirme/test mi?"* |
| no answer | treat it as production |

**Do not infer production from the SID or the hostname.** `PRD`, `PS4`, `P01` are
conventions, not guarantees — naming has been wrong on real customer landscapes, and
guessing "this looks like dev" is exactly the guess that writes to the wrong system.

### What read-only conduct means

- Use the palette in "Analyst workflow" below. It is the same job: read the code, read
  the data, find the cause, and **say what the fix is** — being read-only costs the
  answer nothing.
- Deliver the fix as a proposal — the object, the change, the reasoning — and route it
  through DEV and the transport path like any other change. That is not you being
  unhelpful: an unrecorded change on PRD is what the customer's audit finds later.
- If the user does want a production write, say this once (not per call) and continue on
  a yes: *"Bu bir ÜRETİM sistemi — yaptığın değişiklik orada gerçek olur. Onaylıyor
  musun?"* Never accept it on their behalf, and never widen it: they approved **that
  change**, not free rein for the session.
- Want the belt as well as the rule? `ADT_READONLY=true` refuses mutations at call time,
  and the `sap-adt-readonly` entrypoint never registers the write tools at all. Offer
  either one; do not impose it, and never unset a pin someone else set.

### When SAP itself refuses

`system not modifiable`, `client is locked`, or a request type the system won't create is
**the customer's policy — not a bug, not a tooling fault**. Report it in one line and
route the change to DEV. Do not hunt for a bypass, do not retry, do not try a different
transport type to see whether that one slips through. This is the one refusal that is
*not* covered by "When a connection/write FAILS" above: those four traps are tooling
state that merely looks like a lockdown, this is a real one — and the tell is that reads
keep working perfectly throughout.

## Analyst workflow (READ-ONLY) — for module consultants and exploration

This skill serves TWO readers. Module-consultant installs carry the
`ADT_READONLY=true` pin and use ONLY this section's palette; everything about
transports, pushing, activation and deletion in the rest of this document applies
to write-enabled installs and is **not relevant to a read task — never ask about a
transport for a read.**

**Read-only tool palette** (all safe under the pin):

| Need | Tool |
|---|---|
| What is in this package? | `adt_list_package` |
| Find an object by name | `adt_search` |
| Find code by content (literal/keyword) | `adt_code_search` (degrades to "use adt_search" where the textSearch ICF service is off) |
| Read source (class/program/CDS/table def) | `adt_get_source` — pass `grep="<regex>"` (matching lines + context) or `method="<name>"` (one method/FORM body) to cut tokens on big objects; `include=` for a class's local types (see below) |
| Where is this object/field used? | `adt_where_used` (`positions=True`: line and code of each use) |
| Which program does this include belong to? | `adt_include_main_programs` |
| Where is this variable / type / method defined (F3)? | `adt_find_definition(name, symbol, line=)` |
| Look at the data | `adt_sql` (read-only SELECT, row-capped) |
| Who changed it, when? What changed since the last release? | `adt_revisions`; `adt_revision_diff` (old version vs active, or two versions) |
| What does this transport change, object by object? | `adt_transport_diff(transport)` (layout-only changes ignored; open request = active vs last stored version) |
| Recent runtime errors, then one dump's ST22 chapters | `adt_dumps` (`group=True`: one row per error + program, with `new`), then `adt_dumps(dump=<link from the list>)` |
| Inside one dump, NTT Studio's way: error analysis, source extract, include + line | `adt_dump_detail` (pass the `uri` from `adt_dumps`) |
| Background jobs (SM37): failed, running, scheduled; each step's program | `adt_jobs(job_name=, user=, status=, days=)` |
| What did that job / report print (SP01)? | `adt_spool_list(job=, owner=, days=)`, then `adt_spool_read(number)` -- list spools decoded to lines; another client's spool is refused, not "empty" |
| What's inactive system-wide? | `adt_inactive_objects` |
| Classic BAdI cross-reference | `adt_badi_discovery` |
| Quality signal on existing code | `adt_atc_check`, `adt_syntax_check` (read-only check run; checks the pending version, else the active one) |
| Run existing unit tests (executes ABAP, writes nothing) | `adt_unit_test` |
| Connection health | `adt_logon`, `adt_doctor`, `ping` |

**Analysis recipes** (the module consultant's real questions):

1. **"Tabloyu profille"** — `adt_get_source` on the table (structure, keys) →
   `adt_sql` for a small sample (`SELECT ... UP TO 20 ROWS`) and counts → report
   fields, value distributions of interest, and where the table is written from
   (`adt_where_used` on the table).
2. **"Bu süreç as-is nasıl çalışıyor?"** (FS hazırlığı) — entry point'i bul
   (`adt_search` on the tcode/program) → `adt_get_source` ana programı oku →
   çağrı zincirini `adt_where_used` / `adt_code_search` ile genişlet → veri
   iddialarını `adt_sql` ile doğrula → findings feed `fs-generator`'s As-Is
   section, each statement traceable to an object you actually read.
3. **"Bu alanı/nesneyi değiştirirsek ne etkilenir?"** — `adt_where_used` from the
   object → for field-level impact add `adt_code_search` on the field name →
   present as an impact list (object, type, usage kind).
4. **"Mevcut Z geliştirmelerinin envanteri"** — `adt_list_package` on the brief's
   package(s) → classify by type → `adt_revisions` for freshness where it matters.

**Read-only conduct:**

- The data you SELECT is business (possibly personal) data. Quote the minimum the
  analysis needs, prefer counts/aggregates over row dumps, and never paste large
  result sets into documents or chat.
- A refused mutation is the design working (see "Project brief first") — report it
  as such and route the change to a technical consultant / the abapGit path.
- Read operations never need a transport; do not ask for one.

## CRITICAL RULES

### 1. NEVER hallucinate connection details

**ALWAYS read the `.conn_adt` file BEFORE any SAP operation.** Use ONLY the exact
values from the file. Never invent or reuse SAP URLs, credentials, system names or
transport numbers from memory, examples or previous sessions; verify the connection
with `adt_logon` before working. (Real incident: a fabricated system "FID", client
"100" and transport number sent work to the wrong system.) When in doubt, READ THE
FILE.

### 2. Transport discipline — the single source for everything CTS

> **🔴 ROOT CAUSE OF GHOST TRANSPORTS (proven live 2026-06-09).** A "ghost" /
> *"Generated Request for Change Recording"* is created when you **change an object
> whose transport was already RELEASED**. CTS can't record into the released request,
> so it auto-generates a new one for the lone include. Raw ADT cannot reassign a
> released-owned object (lock/PUT `corrNr` is ignored) — the ONLY prevention is
> workflow: **one open transport, never change released-owned objects.**

**The discipline:**

1. **ONE open transport per workstream**, provided/confirmed by the user. Within an
   open transport, multi-object pushes and public-signature changes do **not** ghost
   (proven). **Pin it once per session with `adt_set_transport`** (after the user
   confirms) — every subsequent `adt_push`/`adt_delete_object` defaults to it. The pin
   lives only in MCP process memory: a new session forces re-confirmation. With no
   transport resolvable, the push REFUSES (`error_type=NoTransportResolved`) with the
   eligible-request list — it never auto-creates or guesses. `adt_transport_status`
   shows the pin + its task + recorded objects.
2. **ALWAYS `adt_list_transports` first**, present the **modifiable `[D]`** ones, and
   **ASK which to use** — never pick one yourself. `[R]` = released — NEVER push there.
3. **NEVER auto-create a transport.** `adt_create_transport` runs ONLY after the user
   explicitly approves name/description. *(AI yaratmaz.)*
4. **NEVER reuse a transport from memory or prior context** — it may be released,
   foreign, or on the wrong system. Re-list and re-confirm. (Real bug: transport
   from memory → 403; the correct one was another number.) A number **CTS reports
   live for this object right now** is not memory and is not a guess — see rule 5.
5. **On a 409 / lock conflict → diagnose, do not retry.** Each blind retry spawns a
   fresh ghost. Run **`adt_transport_check`**: it asks SAP which request actually
   holds the object.
   - **Held by one of your own requests** — the ordinary case, and it is not a
     fault. An object can sit in only one modifiable request at a time; if it is
     already in yours, use that one (`transport=<that>`), and nothing needs
     repairing. This is what the pin cannot see: the pin is your intent, the
     binding is SAP's fact, and the fact wins.
   - **Your own TASK under that request is the same request.** SAP always reports the
     K request (CORRNR), so passing the number of your task in it (the shared-request
     case: the lead's request, your task under it) is accepted and the change lands in
     your task. Any OTHER request still stops. On a push, an object already held in
     another request is no longer added to the one you named as well — it would sit in
     both and travel in halves; the answer says `transport_diverged` and where it went.
   - **Held by someone else** — stop. Do not take the request over. The user talks
     to its owner.
   - **A stale ENQUEUE lock** (a different thing) — `adt_clear_lock`, own locks
     only; foreign ones are SM12. A CTS binding is **not** cleared by SM12; moving
     an object between requests is SE03 → Unlock Objects, and it is the expensive
     path, not the first one.
   Then ONE deliberate call with the transport the check named.
6. **Do NOT change released-owned objects.** If the change must go to a new transport,
   the reassignment is the user's move in SE09 (or via the ZIP bridge / SAP-side
   abapGit, whose internal CTS APIs handle it).

> **🟢 AUTOMATIC GUARD — `GhostTransportPrevented`.** `adt_push` refuses to upload when
> the lock returns **no CORRNR** (SAP did not attribute the object to the requested
> transport — the released-owned case). It releases the lock and returns before the
> source PUT, so no ghost is created at all. The R3TR pre-registration can't save an
> *existing* object: the ADT add-to-transport POST returns 200 but writes **no E071
> row** (verified live). To proceed: assign the object in **SE09 → Include Objects**
> and retry, deliver via the ZIP bridge, or — only on systems that never echo CORRNR —
> set `ABAP_ALLOW_NO_CORRNR=true`.

**Pre-write check:** `adt_transport_check` (read-only, Eclipse's pre-lock check) tells
you whether the object needs recording and which OPEN requests already hold it — run it
before a push when ownership is unclear.

**S-type child tasks are NORMAL:** a successful push makes SAP create S-type tasks
under your K-type workbench request; they release together. The lock always returns the
K-type CORRNR, so subsequent pushes work. If a push fails with "object already in
XXXK9015xx", check `SELECT STRKORR FROM E070 WHERE TRKORR = 'XXXK9015xx'` — STRKORR =
your K-type → safe child; empty/different → foreign transport, stop and ask.

**`IS_LINK_UP='X'` in a lock response = FOREIGN transport** (from
`CL_ADT_CTS_MANAGEMENT`): the object sits in a transport where the current user has no
task — another developer's. The engine raises `SAPLockError` automatically.

**Scatter & cleanup:** `adt_check_scatter` (read-only) shows whether a class's includes
are spread across modifiable requests — run it before pushing a fragmented class.
`adt_remove_from_transport` removes an object's **R3TR** entry from a request (the
inverse of pre-registration); moving **LIMU** include entries between requests is still
SE09-only. `adt_delete_transport` deletes a modifiable transport you OWN, double-
confirmed, and only when it is **empty** — SAP refuses while objects remain (HTTP 400
*"bloke edilen nesneler"*). Cleanup order: move/remove the objects first, then delete
the empty ghost.

### 3. ABAP pitfalls — read before generating code

**Before generating or uploading any ABAP code, read `rules/abap-pitfalls.md` in the
plugin root.** Highlights that cause real failures: class names > 30 chars (SAP hard-
truncates), `;` instead of `.`, `OBLIGATORY` on class methods (selection screens only),
data types that don't exist on the target, `CONDENSE` needing `string`. The file is
updated from real-world failures — always read it fresh.

### 4. ASCII-only in Python `print()` — and NOWHERE else

Windows consoles (`cp1252`/`cp857`) cannot display Unicode: all `print()` output is
ASCII-only (`[OK]`, `[FAIL]`, `[WARNING]`; `to`/`from` instead of arrows).

> **This does not extend to what you write INTO SAP.** Descriptions, text elements,
> titlebars, message texts and ABAP comments go in the **login language with its own
> characters** (`İ ı ş ğ ü ö ç`) — `İhtiyaç Karşılama Takip Raporu`, never
> `Ihtiyac Karsilama Takip Raporu`. Object *names* stay ASCII; that is SAP's
> constraint. **Console = ASCII · payload = the user's language.**
> Full rules: [references/WINDOWS_ENCODING.md](references/WINDOWS_ENCODING.md)

### 5. Windows paths

In Python code, always raw strings for Windows paths: `r'C:\Workspace\project'`.

## Zero-shot execution checklist

Before any SAP operation:

1. **`.conn_adt` exists in the project folder** (never in plugin cache) — then
   `adt_logon` to verify. BTP Cloud: `btp_cloud: true` + `success: false`, or a
   `ParseError`/HTML response on any call → SAML cookies needed/expired → run
   `login_saml_sso.py --cwd <PROJECT_DIR>` (see Configuration).
2. **Landscape guard** — compare the connected system against the project brief's
   landscape (see "Project brief first"). Wrong or unknown system → stop and ask.
3. **Writing code?** Read `rules/abap-pitfalls.md` first (Critical Rule 3).
4. **Scope** — work ONLY in the project's development package (from the brief, or ask).
5. **Transport** — `adt_list_transports` → ask the user → pin with `adt_set_transport`
   (Critical Rule 2). Reads never need one.
6. **Naming** — every object name from the corporate naming standard (next section);
   from a TS, use its 2.1 Object List names verbatim.
7. **Idempotent creates** — "already exists" = success. Never delete without approval.
8. **No temp files in the user's project directory**; scratch work goes elsewhere.

## Tool palette (write / transport / generators)

Read tools are in the Analyst section's palette above. The rest:

| Purpose | Tool |
|---|---|
| Create class/program/interface/include | `adt_create` |
| Create DDIC types | `adt_create_domain`, `adt_create_data_element`, `adt_create_table_type`, `adt_create_type_group`, `adt_create_lock_object`; a table is `adt_create_ddic_shell` then `adt_push` its source; a function group `adt_create_function_group` |
| Check source BEFORE pushing it (nothing written) | `adt_syntax_check(name, object_type, source_file=…)` — fix what it reports, then push; the object must exist |
| **Change part of a source** (prefer this for any edit of an existing object) | `adt_edit_source(name, object_type, old_string, new_string, transport)` — unique match required, syntax-checked before the write, then pushed and activated; `include=` for a class's test/local include |
| **Rewrite one method / FORM / MODULE** | `adt_edit_method(name, method, body, transport)` — body only (or the whole block); `class_name=` when local classes repeat the name; same check and push as `adt_edit_source` |
| Upload + activate source (atomic) | `adt_push(name, object_type, source_file, transport)` — new objects and full rewrites |
| Class **test classes / local types / RAP behaviour-pool handler** | `adt_write_class_include(name, include, source_file, transport)` — `include` = `testclasses` \| `implementations` \| `definitions` \| `macros`; creates the include if the class has none; class stays inactive until `adt_activate` |
| CDS view / metadata extension / access control / **service definition** | `adt_create_cds_view`, `adt_create_metadata_extension`, `adt_create_access_control`, `adt_create_service_definition` |
| Behaviour definition / service binding | `adt_create_behavior_definition`, `adt_create_service_binding` + `adt_publish_service_binding` |
| Activate | `adt_activate` |
| Delete object | `adt_delete_object` (double-confirmed; asks SAP's deletion check first — `adt_deletion_check` on its own changes nothing) |
| Create package | `adt_create_package` |
| List / pre-check / pin / status of transports | `adt_list_transports`, `adt_transport_check`, `adt_set_transport`, `adt_transport_status` |
| Create / delete / detach from transports | `adt_create_transport`, `adt_delete_transport`, `adt_remove_from_transport` (all rule-2-gated) |
| Scatter check / stale lock | `adt_check_scatter`, `adt_clear_lock`; a killed engine's session: `adt_leftover_sessions` |
| Dynpro screens / Adobe Forms / message classes | `adt_generate_screen`, `adt_generate_adobe`, `adt_message_class` |
| Text elements (TEXT-001, selection texts, list headings) | `adt_text_elements` (read), `adt_write_text_elements` (merge by key, activates the pool) |

### A class is not one source file

`source/main` is the global class only. Local classes, macros and test classes are
separate includes: read them with `adt_get_source(include="implementations" |
"testclasses" | "definitions" | "macros" | "all")` (a plain read says when main is an
empty shell, as in every RAP behaviour pool `ZBP_*`), write them with
`adt_write_class_include`, then `adt_activate` the class. Never build an include URL.

- **RAP behaviour pool:** `adt_create_behavior_definition` -> `adt_create` + `adt_push`
  the `ZBP_...` shell (`... FOR BEHAVIOR OF <root>`) -> `adt_write_class_include(include=
  "implementations")` with the `LHC_*` handlers -> `adt_activate` the class, then the BDEF.
- **Service:** CDS views -> `adt_create_service_definition` -> `adt_activate(object_type=
  "srvd")` -> `adt_create_service_binding` -> `adt_publish_service_binding`.

Why each of these holds (measured): [references/CLASS_INCLUDES.md](references/CLASS_INCLUDES.md).

**Object types** for `adt_get_source` / `adt_create` / `adt_push`: `class`,
`interface`, `program`, **`include`** (lives at `programs/includes` — passing `program`
for an include 404s), `table`, `structure`, `dataelement`, `domain`, `cds`,
`functiongroup`, … (full map in `object_types.py` and
[references/OBJECT_TYPES.md](references/OBJECT_TYPES.md)). One word, no underscore:
`data_element` and `function_group` are both rejected by `normalize_object_type`.

**Function modules are the exception, and the trap.** An FM has no URI of its own —
ADT addresses it only under its group.

- **Read:** `adt_get_source(name="ZFM", object_type="function", function_group="ZFG")`.
- **Write:** `adt_write_function_module(name=…, function_group=…, source_file=…)`.
  `adt_push` cannot write one and refuses by name.
- **Find the group:** `adt_sql("SELECT pname FROM tfdir WHERE funcname = 'ZFM'")` —
  the group is `PNAME` without its leading `SAPL`.
- **Never** target the group's generated include (`L<group>U01`, `L<group>U02`, …).
  Those are SAP's compile-time artefacts. The engine's Z/Y namespace guard rejects
  them before the request leaves the machine, so the refusal looks like SAP's and
  is not — which is what makes it cost an hour.

Omitting the group used to build `/sap/bc/adt/functions/modules/{name}`, a path that
exists on no system: a 404 that reads as "the module is missing". It is no longer
buildable — the call raises and names the argument.

**Version check:** `ping` returns `version`, `install_path`, `newest_installed` and
flags `stale_process` — if stale, restart the MCP; never hand-glob the plugin cache.

**Archived CLI (genuine fallback only).** The old per-operation scripts
(`push_object.py`, `download_object.py`, `list_transports.py`, `run_sql_query.py`,
`create_*.py`, …) live in `scripts/_archived_cli/` and are NOT on the active path. If
an old doc names one, the MCP tool of the same stem is the replacement
(`download_object.py` → `adt_get_source`, `run_sql_query.py` → `adt_sql`, …; catalog:
[references/SCRIPTS_REFERENCE.md](references/SCRIPTS_REFERENCE.md)). Run them only when
the MCP is truly down, from the newest cache version (`sort -V | tail -1`, never
`head -1`) — and remember each call is a fresh process: per-process pushes produce the
false lock/403 artifacts described in "When a connection/write FAILS".

Still on the active path (not tools, run directly when needed): `run_check_logon.py`,
`sap_doctor.py`, `login_saml_sso.py`, `create_package.py`, `setup_credentials.py`.

## Configuration (.conn_adt)

Create `.conn_adt` in your **project folder** (where Claude Code is opened):

```env
ADT_SAP_URL=https://your-sap-server.com:44300
ADT_SAP_USER=YOUR_USERNAME
ADT_SAP_PASSWORD=YOUR_PASSWORD
ADT_SAP_CLIENT=100
ADT_SAP_LANGUAGE=EN
# Optional: ADT_SAP_SSL_VERIFY=false (default for self-signed certs)
# Optional: ADT_TIMEOUT_SHORT=30, ADT_TIMEOUT_DEFAULT=60, ADT_TIMEOUT_LONG=120
```

- `.conn_adt` (not `.env`), `ADT_` prefix, never committed (`.gitignore`).
- One `.conn_adt` per project folder supports multi-client setups.
- **Missing/invalid? Write the file — never the credentials.** Ask for URL, client
  and language; none of those is a secret. Write `.conn_adt` with those filled and
  `ADT_SAP_USER=` / `ADT_SAP_PASSWORD=` left **empty**, then ask the user to fill
  those two lines in the file and say when they have. Verify with `adt_logon`.

  **Never ask for a password in the conversation, and never accept one offered
  there.** The transcript is stored; on a customer system that is the consultant's
  real SAP account, and it is out of your hands the moment it is typed. This holds
  however convenient the alternative looks — including
  `setup_credentials.py --json '{"password": …}'`, whose help text says *"for LLM
  agent usage"* and which additionally puts the value in the machine's process
  list. **That mode is for a human at a terminal, not for you**; the interactive
  form (`setup_credentials.py --cwd <dir>`, no flags) is the one to hand them,
  because the password goes into a prompt you never see.

- **After any edit to `.conn_adt`, restart the MCP server** — it caches one client
  for its lifetime (see "When a connection/write FAILS").

### Switching systems, BTP Public Cloud

- **The user wants another system:** build `.conn_adt` from SAP Logon with
  `sapgui_landscape.py --list --probe` -- ask which system, **ask its tier (DEV/QA/PRD;
  mandatory, unsure = PRD)**, never put a password on a command line. The full flow and
  what the script refuses: [references/CONNECTION_SETUP.md](references/CONNECTION_SETUP.md).
- **`.s4hana.cloud.sap`:** Basic Auth is not supported -- SAML (`login_saml_sso.py`) or
  OAuth2/IAS; HTTP 406 on transport create there is success. Details in the same file.

## Database operations & ABAP SQL (`adt_sql`)

Use SQL as a **last resort** — prefer the object-level tools. Results are business
(possibly personal) data: minimum quotes, no bulk dumps (see Analyst conduct).

| Feature | Standard SQL | ABAP SQL |
|---------|-------------|----------|
| Sort | `ORDER BY col DESC` | `ORDER BY col DESCENDING` |
| Column qualifier | `table.column` | `table~column` (tilde!) |
| Row limit | `LIMIT N` | `max_rows` parameter (or `UP TO n ROWS`) |
| Boolean | `TRUE`/`FALSE` | `'X'`/`' '` |
| Statement end | `;` | none |

Examples: `adt_sql(query="SELECT DEVCLASS FROM TDEVC WHERE DEVCLASS LIKE 'ZMM%'")`,
`adt_sql(query="SELECT COUNT(*) FROM ZSD001_T_LOG", max_rows=1)`.
Full syntax: [references/ABAP_SQL_REFERENCE.md](references/ABAP_SQL_REFERENCE.md)

## Supported object types

| Category | Types |
|----------|-------|
| **Development** | class (CLAS), interface (INTF), program (PROG), include (INCL), functiongroup (FUGR), function (FUNC) |
| **DDIC** | Domain, Data Element, Structure, Table, CDS View (DDL), Metadata Extension (DDLX), Access Control (DCL) |
| **RAP** | Service Definition (SRVD), Service Binding (SRVB), Behavior Definition (BDEF), Annotation Definition (DDLA) |

> Endpoints: [references/OBJECT_TYPES.md](references/OBJECT_TYPES.md) · RAP details:
> [references/RAP_CDS_OBJECTS.md](references/RAP_CDS_OBJECTS.md) · DDIC creation:
> [references/DDIC_OBJECTS.md](references/DDIC_OBJECTS.md)

## Naming conventions — the corporate standard is the ONLY source

Object names are NOT invented here. **Every Z/Y name comes from the NTT DATA/TR
naming standard** — the same document `ts-generator` uses, so the names in a TS and
the objects you create from it always match:

- **Where to find it:** in NTT-managed installs the document skills sit next to
  this one — read `../ts-generator/references/NAMING_STANDARD.md` (project skills
  dir and cache both have it). In a classic plugin install it is in the
  `sap-consultant` plugin under `skills/ts-generator/references/`.
- **Parameters come from the project brief** (`CLAUDE.md`): `<Prefix1>` (Z/Y) and
  `<PkgNo>`; the module code comes from the work item. On conflict the brief wins.
- **Working from a TS?** Use the names in its 2.1 Object List verbatim — they were
  already generated from the standard. Never "improve" them.

### Before writing anything from a TS: resolve `<ZPKG>` (three questions)

A TS never carries a concrete package name. It writes `<ZPKG>_P_REQ_SOURCE`,
because the package is the next free number in the development system at the
moment work starts — not something knowable when the document was written
(NAMING_STANDARD §1.2). Angle brackets cannot occur in an ABAP name, so a
placeholder that reached the system by accident fails activation rather than
creating a wrongly-named object.

**Resolve it once, at the start, in this order. Do not begin creating objects
until all three are settled:**

| # | Question | How to answer it well |
|---|---|---|
| 1 | **Which module?** | Usually already in the TS / the WRICEF id (`MM019` → `MM`). State what you read and ask only for confirmation. |
| 2 | **Which package?** | **Do not just ask — look.** Read the existing packages for that module (`adt_sql`: `SELECT DEVCLASS FROM TDEVC WHERE DEVCLASS LIKE 'Z<MOD>%'`), then propose the next free number: *"ZMM000-012 var, sıradaki ZMM013 — bunu kullanayım mı?"* The user confirms or names another. Never invent a number without looking, and never reuse the WRICEF number as the package number — they are unrelated and matching once is a coincidence. |
| 3 | **Which transport request?** | List the user's modifiable requests (`adt_list_transports`) and let them choose. **Never fabricate one** (Critical Rule 2). If the package is new it must be created first, and package creation itself needs a request. |

Then substitute `<ZPKG>` **everywhere** — package, program, includes, classes,
structures — and repeat the resolved value back in one line before the first
write, so a wrong answer is caught before objects exist rather than after.

If the TS still contains a concrete package name instead of the placeholder, treat
it as suspect: it was either written before this rule or hand-edited. Check the
number is actually free before using it.

- **Two languages, one rule each** (§1.1 and §3.3): the technical **name** is always
  **English** UPPER_SNAKE, derived from what the object does — never a Turkish or
  transliterated stem, never the WRICEF id or the object type. The **description**
  and every user-visible text (DDIC labels, text elements, selection texts, message
  texts) go in the **login language** of the connection — read it from `.conn_adt`
  (`ADT_SAP_LANGUAGE`); if it is not set and the brief does not say, ask. A Turkish
  description is written with its real letters (`Seçim ekranı`), never ASCII-folded.
- **If the standard is unreachable** (file missing, ts-generator not installed): do NOT
  fall back to improvised conventions — ask the user, or mark the name
  `[teyit gerekli]` and say which formula you could not verify.

Mechanical rules that still apply regardless of formula:
- One type prefix per object — `ZSD001_T_D_TEST` is wrong for a domain
  (`_T_` is ONLY for tables); use the domain formula.
- Respect per-type MaxLen (tables 16, message class 20, …) — the standard lists
  them; ADT rejects overlong names late and ugly.
- Legacy `ZAI_*` example names in older references illustrate API mechanics only —
  they are NOT naming guidance.

## Architectural guidelines

When creating a program (report), **always create a class first** and consume it in
the program: business logic, DB access and calculations in the class; selection
screen, WRITE/output and event handlers in the program.

## Operation notes

**Guardrails (code-enforced, not just guidance).** `guardrails.py` runs BEFORE any
HTTP request; violations return `[BLOCKED]` (`error_type=GuardrailViolation`) without
touching SAP:
- **Customer namespace only** — create/push/delete refused for non-`Z`/`Y` objects
  (`/NSP/`-wrapped customer namespaces allowed).
- **`ADT_READONLY=true`** makes a QA/PRD `.conn_adt` safe: all mutations refused at
  call time. When the system must be unwriteable *by construction*, use the
  `sap-adt-readonly` entrypoint instead (write tools never registered).
- **Naming standard (WARNS, does not block).** Every CREATE checks the name
  against `ts-generator/references/NAMING_STANDARD.md` (`naming.py`) and the
  verdict rides back in the result as `naming`:
  `{conforms, expected, rule}`. `conforms` is three-valued and the three are
  different answers: `true` checked and fine, `false` in breach, `null` not
  checked (no rule for the type, or a name that is not freely chosen -- the
  `ZND_` tooling family, or the `ZZ`/`ZZ1_` objects whose names come from
  SAP's own). It catches what a linter cannot: a behaviour definition must carry
  the SAME name as its root view and a metadata extension the same name as the
  view it extends (v2.0; the older `_I_` and `_MX_` forms are still in the
  field). A wrong name is a convention breach, not damage, so the object IS
  created -- set **`ADT_NAMING=block`** in `.conn_adt` to refuse instead.
  Create paths only: a push would re-warn forever about a name settled long ago.
- **Auth-failure circuit breaker:** after the FIRST authentication failure every SAP
  call latches off (`error_type=AuthLockdown`) instead of retrying logon — this
  structurally prevents burning SAP's `login/fails_to_user_lock` attempts.
  `ping`/`adt_doctor` stay usable; fix `.conn_adt`, then `adt_logon` (one recovery
  attempt, clears the latch on success) or restart the MCP.
- **Actionable `hint` on errors:** structured errors carry the concrete recovery
  recipe (SE09 Include-Objects, SM12, SE03, re-read-then-push, …) for
  `GhostTransportPrevented`, `NoTransportResolved`, `SourceDriftDetected`, lock and
  already-exists cases.
- **Work in the project's transported `Z`/`Y` package.** Local `$TMP` objects can be
  pushed and deleted without a transport (since 2026-09-03), but use `$TMP` only for a
  throwaway test or when the user asks for it. (The generator skills'
  bootstrap FMs are the deliberate exception and live in their own SKILL.md. Installing
  one once per dev system is NOT a breach of "every object in package X": those words
  cover what you build. Install, continue, and name the FM in the final report.)

**Activation.** `adt_push` auto-activates. Same-user stale locks are auto-cleared;
foreign locks are SM12. DDIC objects: no lock needed — create → activate immediately.
**A lock under your OWN user that will not clear.** `adt_clear_lock` (and the retry the
engine runs on a 403) locks and unlocks *its own* reference and reports success; it cannot
release a second, live session of the same user — usually a SAP GUI window in SE38/SE80/SE24/
SE11 in *change* mode, not display, or the ADT session of an engine process that was killed
(closed terminal, restarted launcher). The engine closes the second kind itself when it
starts; if "currently editing" still appears, run `adt_leftover_sessions` once. The 403
comes back unchanged for a GUI window. Close that window first.
Only then SM12, and filter by **USER**, never by object name: the enqueue argument rarely
matches a text search on the name (program text elements share the program's own enqueue).
**Runtime buffer:** ADT activation may not flush a running app server's class buffer —
if activated changes don't take effect, re-activate via Eclipse/SE24 or run
`/$ABAP_BUFFER_RESET` (SM04), per app server on load-balanced systems.

**Push failed?** Do not blind-retry — each retry acquires a new lock and can spawn a new
auto-generated S-task (Critical Rule 2 item 5). What you do next depends on the error:

- **A content error in an object you created in THIS session** (syntax error, a line over
  255 characters, a type/name mistake, an activation message naming your own code): fix
  the source and push again, at most **twice**, and only if `lock_released` was true and
  `ghost_prevented` was false. Run `adt_syntax_check` between attempts. This is the
  normal edit loop, not a retry. Never leave an object INACTIVE and call the job done:
  after the last attempt either it is active or the report says exactly which message
  blocks it.
- **Anything else** — lock, transport, ghost, auth, drift, an object you did not create,
  or the third failure: STOP and report; do not retry without explicit confirmation.

**Build what you can, then name the gap.** If one part of a task has no tool, still create
and activate every part that does (tables, CDS, classes, service definition, …) and end
with a list of exactly what is missing and why. Refusing the whole task because one piece
is unsupported turns a 90 % result into a 0 % one; the 2026-11-11 comparison measured
this (RAP service refused up front, nothing created).

**Deletion.** Classes/interfaces/programs need the lock cycle — `adt_delete_object`
handles it. DDIC objects delete without a lock. Tables: use SE11.

**Error types.**

| Exception | Meaning / move |
|-----------|----------|
| `SAPConnectionError` | URL/VPN/timeouts — check `.conn_adt`, `adt_doctor` |
| `SAPAuthenticationError` | Bad credentials → the AuthLockdown latch is now on; fix `.conn_adt`, restart or `adt_logon` |
| `SAPLockError` | Transport conflict or user lock — Critical Rule 2 items 4–5; NEVER take the transport number from the error message |
| `SAPTransportError` | `adt_list_transports` + ask |
| `SAPActivationError` | Run `adt_syntax_check` first |

Retry mechanics (media types, CSRF refresh, transport-parameter variants) are handled
inside the library — details in [references/WORKFLOWS.md](references/WORKFLOWS.md).

## Reporting bugs

```bash
gh issue create --repo global-innovation-lab/ntt-sap-agent-kit \
  --title "[Bug][sap-adt] <short description>" --label bug \
  --body "Steps, expected/actual, plugin version (from ping), OS, SAP system type"
```

Check first: `gh issue list --repo global-innovation-lab/ntt-sap-agent-kit --label bug --search "<keyword>"`

## References

- [references/SCRIPTS_REFERENCE.md](references/SCRIPTS_REFERENCE.md) — **archived CLI**
  catalog (fallback only; the MCP tools are the interface)
- [references/SAPCLIENT_API.md](references/SAPCLIENT_API.md) — SAPClient methods (for
  working on the engine itself)
- [references/WINDOWS_ENCODING.md](references/WINDOWS_ENCODING.md) — encoding rules
- [references/ABAP_SQL_REFERENCE.md](references/ABAP_SQL_REFERENCE.md) — ABAP SQL syntax
- [references/WORKFLOWS.md](references/WORKFLOWS.md) — lock/retry/deletion internals
- [references/OBJECT_TYPES.md](references/OBJECT_TYPES.md) — object type reference
- [references/DDIC_OBJECTS.md](references/DDIC_OBJECTS.md) — DDIC creation guide
- [references/RAP_CDS_OBJECTS.md](references/RAP_CDS_OBJECTS.md) — RAP & CDS types
- [references/CLASS_INCLUDES.md](references/CLASS_INCLUDES.md) — class includes, RAP pool and service recipes
- [references/CONNECTION_SETUP.md](references/CONNECTION_SETUP.md) — switching systems, BTP
- [references/HTTP_TRANSPORT.md](references/HTTP_TRANSPORT.md) — the local HTTP server
- SAP ADT documentation: https://api.sap.com/package/SAPDevelopmentToolsForEclipse
