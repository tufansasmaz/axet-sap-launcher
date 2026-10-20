#!/usr/bin/env python3
"""Publish an approved document from the project store to Orbit.

The store stays the approval record; Orbit is where the team reads. A published
document becomes a page in the project's own page tree (for Customer K:
`Home -> 05 - TS Dökümanları -> QM - TS Dokümanları -> QM014 - TS - ...`), a link
to that page on the development's work item, and a comment saying which version
was published and by whom. That is how the team already files documents by hand
(measured 2026-09-28): a work item has no pages section of its own, it carries
links.

Decisions this follows (2026-09-24, with the project owner):
  - the kit writes; a page someone edited in Orbit is detected and never
    silently overwritten;
  - each consultant writes with their own Orbit session, no service account;
  - one kit project = one Orbit project (`orbit_project` in the development list);
  - the Orbit key (PRJK-2768) is the id, the development code (QM014) the name.

Commands
--------
  plan    --record R                       what would be written, nothing sent
  publish --record R --confirmed [--overwrite-edits] [--title-prefix P]
  status  --record R                       is the published page as we left it?
  unpublish --record R --confirmed         remove the page, its link and the last comment

`--confirmed` is the person's explicit yes, as for `project_store.py save
--approved`: publishing puts the document where the whole project team reads.
`--overwrite-edits` is a second, separate yes, asked only after `publish`
reported that the page was changed in Orbit.

State lives beside the record, `<stem>.orbit.json`: page, link and comment ids,
and the hash of the page's TEXT as Orbit stored it after our write -- not its
HTML, which Orbit's editor rewrites when a page is merely opened. The approval
record itself is never touched.

Exit codes: 0 ok, 2 usage, 3 no Orbit session, 5 refused (not confirmed, or the
page was edited in Orbit), 6 cannot be placed (no Orbit project, item or folder),
7 Orbit error.
"""
from __future__ import annotations

import argparse
import datetime as _dt
import hashlib
import html
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import project_store as ps  # noqa: E402
from orbit_client import NoAccess, NoSession, Orbit, OrbitError  # noqa: E402
from orbit_html import markdown_to_orbit  # noqa: E402

EXIT_USAGE, EXIT_NO_SESSION, EXIT_REFUSED, EXIT_PLACE, EXIT_ORBIT = 2, 3, 5, 6, 7
STATE_SUFFIX = ".orbit.json"

# Which top-level folder of the project's page tree takes which kind. Matched on
# the folder NAME, because the tree is the team's and its numbering differs per
# project ("05 - TS Dökümanları" on Customer K). Nothing is created at this
# level: a project without such a folder is told so, not given a new tree.
KIND_FOLDER = {
    "FS": r"\bFS\b",
    "TS": r"\bTS\b",
    "Kullanici-Dokumani": r"Kullan[ıi]c[ıi]",
    "Test": r"\bTest",
    "BBP": r"Çözüm|BBP",
    "Toplanti-Notlari": r"Toplant[ıi]",
}
KIND_LABEL = {"FS": "FS", "TS": "TS", "Kullanici-Dokumani": "KD", "Test": "Test",
              "BBP": "BBP", "Toplanti-Notlari": "Toplantı"}
KEY_RE = re.compile(r"^([A-Z][A-Z0-9]*)-(\d+)$")


def die(msg: str, code: int) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(code)


def sha(s: str) -> str:
    return "sha256:" + hashlib.sha256(s.encode("utf-8")).hexdigest()


def page_text(page_html: str) -> str:
    """What a reader sees, for telling an edit from a re-save.

    Opening a page in Orbit's editor rewrites its stored HTML without anyone
    typing a thing (measured 2026-09-28, 80 KB became 128 KB): entities are
    decoded, every <code> gains a style class, a code block loses its language,
    and bold around inline code is dropped. Comparing the HTML called every
    viewed page "edited". The text survives all of that; a person's edit does
    not."""
    t = re.sub(r"<[^>]+>", " ", page_html or "")
    t = html.unescape(t).replace("\xa0", " ")
    return re.sub(r"\s+", " ", t).strip()


def text_sha(page_html: str) -> str:
    return sha(page_text(page_html))


def state_path(record: Path) -> Path:
    return record.with_name(record.name[: -len(ps.RECORD_SUFFIX)] + STATE_SUFFIX)


# --- what is being published --------------------------------------------------

def load(record_arg: str) -> dict:
    record = Path(record_arg)
    if not ps.long_path(record).is_file() or not record.name.endswith(ps.RECORD_SUFFIX):
        die(f"{record} is not an approval record (*{ps.RECORD_SUFFIX})", EXIT_USAGE)
    rec = json.loads(ps.long_path(record).read_text(encoding="utf-8"))
    md = next((f["name"] for f in rec.get("files", []) if f["name"].lower().endswith(".md")), None)
    if not md:
        die("the record has no Markdown file; Orbit pages are built from the .md", EXIT_USAGE)
    md_path = record.parent / md
    text = ps.long_path(md_path).read_text(encoding="utf-8")
    # Publish only what was approved: the Markdown must still match its record.
    want = next(f["sha256"] for f in rec["files"] if f["name"] == md)
    if ps.sha256(md_path) != want:
        die(f"{md} changed after approval; approve the new version first", EXIT_REFUSED)
    store = ps.find_store()
    code = rec.get("project", "")
    lst = ps.read_list(store, code) if store else None
    return {"record": record, "rec": rec, "md": text, "list": lst, "code": code}


def placement(o: Orbit, d: dict, prefix: str = "") -> dict:
    """Resolve project, work item, page folder and title. Reads only."""
    rec, lst = d["rec"], d["list"]
    kind = rec.get("kind", "")
    if kind not in KIND_FOLDER:
        die(f"{kind!r} documents are not published to Orbit", EXIT_PLACE)
    ident = (lst or {}).get("orbit_project")
    if not ident:
        die(f"project '{d['code']}' is not tracked in Orbit (its development list names "
            f"no orbit_project)", EXIT_PLACE)
    project = o.project_by_identifier(ident)
    pid = project["id"]

    item_key = rec.get("item") or ""
    item = info = None
    if kind not in ps.PROJECT_KINDS:
        m = KEY_RE.match(item_key.upper())
        if not m or m.group(1) != ident.upper():
            die(f"the record names item {item_key!r}, not an {ident}-<no> Orbit key", EXIT_PLACE)
        item = o.item_by_key(item_key)
        info = next((i for i in lst.get("items", []) if str(i.get("id")) == item_key), {})

    tops = o.top_pages(pid)
    home = next((p for p in tops if "home" in p["name"].lower()), tops[0] if tops else None)
    if not home:
        die(f"{ident} has no page tree yet", EXIT_PLACE)
    kinds = o.child_pages(pid, home["id"])
    folder = next((p for p in kinds if re.search(KIND_FOLDER[kind], p["name"])), None)
    if not folder:
        die(f"{ident}'s page tree has no folder for {kind} under '{home['name']}'. Ask the "
            f"project lead where these documents live; the tool does not invent the tree.",
            EXIT_PLACE)
    parent, where = folder, [home["name"], folder["name"]]
    code = (info or {}).get("code") or ""
    module = re.match(r"[A-Z]+", code).group(0) if code else (info or {}).get("module", "")
    if module:
        sub = next((p for p in o.child_pages(pid, folder["id"])
                    if re.match(rf"{re.escape(module)}\b", p["name"])), None)
        if sub:
            parent, where = sub, where + [sub["name"]]

    title_src = (info or {}).get("title") or rec.get("item_title") or Path(rec["files"][0]["name"]).stem
    bare = re.sub(rf"^\s*{re.escape(code)}\s*[:\-–]\s*", "", title_src) if code else title_src
    title = f"{prefix}{code + ' - ' if code else ''}{KIND_LABEL[kind]} - {bare}".strip()
    return {"pid": pid, "ident": ident, "item": item, "item_key": item_key.upper(),
            "parent": parent, "where": where, "title": title[:255], "kind": kind}


# --- commands ------------------------------------------------------------------

def _orbit() -> Orbit:
    try:
        return Orbit()
    except NoSession as exc:
        die(str(exc), EXIT_NO_SESSION)


def cmd_plan(args) -> int:
    d = load(args.record)
    o = _orbit()
    pl = placement(o, d, args.title_prefix or "")
    st = _state(d["record"])
    print(f"orbit:   {o.base} ({o.ws}) as {o.email}")
    print(f"page:    {pl['title']}")
    print(f"under:   {' -> '.join(pl['where'])}")
    if pl["item"]:
        print(f"link on: {pl['item_key']} ({pl['item'].get('name', '')})")
    print(f"action:  {'update page ' + st['page_id'] if st else 'create a new page'}")
    return 0


def _state(record: Path) -> dict | None:
    p = state_path(record)
    return json.loads(ps.long_path(p).read_text(encoding="utf-8")) if ps.long_path(p).is_file() else None


def cmd_status(args) -> int:
    d = load(args.record)
    st = _state(d["record"])
    if not st:
        print("not published to Orbit.")
        return 0
    o = _orbit()
    try:
        page = o.get(o.project_path(st["project_id"], f"/pages/{st['page_id']}/"))
    except OrbitError as exc:
        print(f"published page is gone ({exc}).")
        return 1
    same = text_sha(page.get("description_html") or "") == st["text_sha256"]
    print(f"v{st['version']} published {st['published_at']} by {st['by']}: {st['page_url']}")
    print("as published." if same else "CHANGED in Orbit since it was published.")
    return 0 if same else 1


def cmd_publish(args) -> int:
    if not args.confirmed:
        die("refusing to publish without --confirmed. Show the person the plan "
            "(`plan`) and pass it only after an explicit yes.", EXIT_REFUSED)
    d = load(args.record)
    o = _orbit()
    pl = placement(o, d, args.title_prefix or "")
    pid, rec = pl["pid"], d["rec"]
    body = markdown_to_orbit(d["md"])
    st = _state(d["record"])
    pages = o.project_path(pid, "/pages/")

    page = None
    if st:
        try:
            page = o.get(o.project_path(pid, f"/pages/{st['page_id']}/"))
        except OrbitError:
            page = None                     # deleted in Orbit: publish afresh
        if page and page.get("archived_at"):
            page = None
        if page and text_sha(page.get("description_html") or "") != st["text_sha256"] \
                and not args.overwrite_edits:
            print(f"The page was changed in Orbit after v{st['version']} was published "
                  f"({page.get('updated_at', '')[:16]}). NOTHING was sent.", file=sys.stderr)
            print("  Ask the person: keep the Orbit edits (and fold them into the source), "
                  "or overwrite them with this approved version (`--overwrite-edits`).",
                  file=sys.stderr)
            return EXIT_REFUSED

    if page:
        o.request("PATCH", o.project_path(pid, f"/pages/{page['id']}/"),
                  body={"name": pl["title"], "description_html": body})
        page_id = page["id"]
    else:
        made = o.request("POST", pages, body={"name": pl["title"], "access": 0,
                                               "description_html": body,
                                               "parent": pl["parent"]["id"]})
        page_id = made["id"]
        if made.get("parent_id") != pl["parent"]["id"]:
            # Orbit has answered 201 and ignored the parent before; set it again.
            o.request("PATCH", o.project_path(pid, f"/pages/{page_id}/"),
                      body={"parent": pl["parent"]["id"]})
    back = o.get(o.project_path(pid, f"/pages/{page_id}/"))
    url = o.page_url(pid, page_id)

    link_id = (st or {}).get("link_id")
    comment_id = None
    if pl["item"]:
        links_path = o.project_path(pid, f"/issues/{pl['item']['id']}/issue-links/")
        links = o.get(links_path) or []
        mine = next((l for l in links if l.get("url") == url), None)
        if not mine:
            label = {"TS": "Teknik Spesifikasyon", "FS": "Fonksiyonel Spesifikasyon",
                     "Kullanici-Dokumani": "Kullanıcı Dokümanı", "Test": "Test Dokümanı"}[pl["kind"]]
            mine = o.request("POST", links_path, body={"title": f"{args.title_prefix or ''}{label}",
                                                       "url": url})
        link_id = mine["id"]
        appr = rec.get("approved", {})
        note = (f"<p>{pl['kind']} v{rec.get('version')} yayınlandı: "
                f'<a href="{url}">{pl["title"]}</a>. Onaylayan: {appr.get("by_name", "")} '
                f"({str(appr.get('at_utc', ''))[:10]}).</p>")
        comment = o.request("POST", o.project_path(pid, f"/issues/{pl['item']['id']}/comments/"),
                            body={"comment_html": note})
        comment_id = (comment or {}).get("id")

    state = {
        "schema": 1, "orbit": o.base, "workspace": o.ws, "project": pl["ident"],
        "project_id": pid, "page_id": page_id, "page_url": url, "item": pl["item_key"] or None,
        "link_id": link_id, "last_comment_id": comment_id, "version": rec.get("version"),
        "text_sha256": text_sha(back.get("description_html") or ""),
        "published_at": _dt.datetime.now(_dt.timezone.utc).replace(microsecond=0).isoformat(),
        "by": o.email,
    }
    ps.long_path(state_path(d["record"])).write_text(json.dumps(state, indent=2), encoding="utf-8")
    print(f"{'updated' if page else 'published'}: {pl['title']}")
    print(f"  page: {url}")
    print(f"  under: {' -> '.join(pl['where'])}")
    if pl["item"]:
        print(f"  linked on {pl['item_key']}, comment added")
    return 0


def cmd_unpublish(args) -> int:
    """Take back what `publish` put in Orbit: the link, the last comment, the page
    (archived, then deleted -- Orbit refuses to delete a live page)."""
    if not args.confirmed:
        die("refusing to unpublish without --confirmed", EXIT_REFUSED)
    d = load(args.record)
    st = _state(d["record"])
    if not st:
        print("not published to Orbit -- nothing to remove.")
        return 0
    o = _orbit()
    pid = st["project_id"]
    if st.get("item"):
        item = o.item_by_key(st["item"])
        base = o.project_path(pid, f"/issues/{item['id']}")
        for what, path in (("link", f"{base}/issue-links/{st.get('link_id')}/"),
                           ("comment", f"{base}/comments/{st.get('last_comment_id')}/")):
            if path.rstrip("/").endswith("None"):
                continue
            try:
                o.request("DELETE", path)
                print(f"  {what} removed")
            except OrbitError as exc:
                print(f"  {what}: {exc}")
    page = o.project_path(pid, f"/pages/{st['page_id']}")
    try:
        o.request("POST", f"{page}/archive/")
    except OrbitError:
        pass                                  # already archived or gone
    try:
        o.request("DELETE", f"{page}/")
        print("  page removed")
    except OrbitError as exc:
        print(f"  page: {exc}")
    ps.long_path(state_path(d["record"])).unlink()
    return 0


def main() -> int:
    for _s in (sys.stdout, sys.stderr):
        try:        # a cp1252 console cannot print a Turkish page title
            _s.reconfigure(errors="replace") if _s.isatty() else _s.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError, OSError):
            pass
    ap = argparse.ArgumentParser(description="Publish an approved document to Orbit.")
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name, fn in (("plan", cmd_plan), ("publish", cmd_publish), ("status", cmd_status),
                     ("unpublish", cmd_unpublish)):
        p = sub.add_parser(name)
        p.add_argument("--record", required=True)
        p.add_argument("--title-prefix", help=argparse.SUPPRESS)
        if name in ("publish", "unpublish"):
            p.add_argument("--confirmed", action="store_true")
        if name == "publish":
            p.add_argument("--overwrite-edits", action="store_true")
        p.set_defaults(func=fn)
    args = ap.parse_args()
    try:
        return args.func(args)
    except NoSession as exc:
        die(str(exc), EXIT_NO_SESSION)
    except NoAccess as exc:
        die(str(exc), EXIT_PLACE)
    except OrbitError as exc:
        die(str(exc), EXIT_ORBIT)


if __name__ == "__main__":
    sys.exit(main())
