#!/usr/bin/env python3
"""project_store -- keep approved project documents in one shared place, with a record.

Python stdlib ONLY: this runs on consultant machines.

Why this exists
---------------
An FS or TS generated inside aXet.code used to end its life in `./fs-output/` on
one consultant's disk. Nobody else could find it, nothing said which version the
customer saw, and "approved" meant whatever the author remembered. The store is a
SharePoint folder synced through OneDrive; this script copies a document into it
and writes a record next to it saying who approved which bytes, when.

What the record can and cannot prove
------------------------------------
It proves WHICH ACCOUNT ran the save: the OneDrive business account that syncs the
store, cross-checked against the Windows UPN. SharePoint independently stamps
"Modified By" on the synced file, server-side, so the two corroborate each other.
It does NOT prove a human read the document. That is what `--approved` is for:
the agent passes it only after asking the person and getting an explicit yes, the
same rule as the installer's `--yes-notice`. Never pass it on your own initiative.

No tenant, URL or key in here (house rule). The store is found by CONTENT: the
synced folder that carries STORE_MARKER, located through OneDrive's own record of
what it syncs. How to sync it lives in the department's setup document.

Layout
------
    Projects/<project>/<ITEM>/<KIND>/          e.g. beta-enerji/SD007/FS/
    Projects/<project>/_Listesiz/<KIND>/       no list loaded, or no item given
    Projects/<project>/_liste.json             the development list (Orbit)

One folder per development ITEM, a KIND folder always inside it, because the
work ships per item: Beta Enerji's flow carries six deliverables for a single
development (FS, TS, ABAP, two tests, user doc) and a kind-first layout filed
one job in six places. The list lives in the STORE rather than in the project
brief: the brief ships with the catalog, and a new catalog stamp rewrites every
installed skill on every machine, which is too much for a file that follows a
live tracker.

Commands
--------
  where                        locate the synced store
  whoami                       the identity a record would carry
  items  [--project DIR]       the development list, or how to load one
  init   --dest DIR            maintainer, once: mark a synced folder as the store
  save   --kind K --file F [--file F ...] --approved
         [--item ID] [--project DIR] [--skill NAME]
  assign --record R --item ID  name the item for a set saved before the list
  reconcile [--apply]          move _Listesiz sets into their item folders
  verify --record R            recompute the hashes; exit 1 if anything changed

Exit codes: 0 ok, 1 verify mismatch, 2 usage, 3 store not synced,
            4 the folder is not installed for a central project,
            5 refused (not approved, or --code),
            6 --item is not in the development list
"""
from __future__ import annotations

import argparse
import datetime as _dt
import hashlib
import json
import os
import re
import shutil
import sys
import zipfile
from pathlib import Path

STORE_MARKER = ".ntt-projects.json"
PIN_NAME = ".ntt-profile.yaml"
# The development list names the kinds; this is the fallback when no list
# is loaded. Beta Enerji's flow alone has six (FS, TS, ABAP, two tests, user doc).
DEFAULT_KINDS = ("FS", "TS", "BBP")
LIST_NAME = "_liste.json"
# Everything lands here until a list says otherwise. Leading underscore so it
# does not sort in among the item folders.
UNLISTED = "_Listesiz"
RECORD_SUFFIX = ".onay.json"
# A project code becomes a folder name inside a SHARED library, so it is held to
# a slug: no separators, no dots, no way to climb into another project's folder.
CODE_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,60}$")
# An Orbit id. Short on purpose: the store sits ~120 chars deep inside a synced
# OneDrive root that is longer on some machines, and Windows still refuses 260.
# Measured 2026-09-20: <id> - <title> folders reach 275 on a plausible root and
# OneDrive then stops syncing the file without saying anything. The title lives
# in the list and in the record, never in a path.
ITEM_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,24}$")

EXIT_MISMATCH, EXIT_USAGE, EXIT_NOT_SYNCED, EXIT_NO_CODE, EXIT_REFUSED = 1, 2, 3, 4, 5
EXIT_UNKNOWN_ITEM = 6


def _console() -> None:
    """cp1254/cp857 consoles cannot print a Turkish project path; see ntt_setup."""
    for stream in (sys.stdout, sys.stderr):
        try:
            if stream.isatty():
                stream.reconfigure(errors="replace")
            else:
                stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError, OSError):
            pass


# Shared with fast-scan-question-generator: one way to find a synced library,
# not two. The fallback keeps this script runnable on its own -- it is the one
# a consultant may be told to run by hand when a save failed.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "lib"))
try:
    from onedrive import long_path, candidate_roots
except ImportError:      # pragma: no cover - only without the plugin root
    long_path = None


def _long_path_fallback(p: Path) -> Path:
    r"""Prefix a Windows path so MAX_PATH stops applying.

    A shared library path is long before a single customer folder is added, and
    on 2026-09-08 a consultant with a longer user name could not install at all
    for exactly this reason. Everything written into the store goes through here.
    """
    if os.name != "nt":
        return p
    s = str(p)
    if s.startswith("\\\\?\\"):
        return p
    try:
        s = str(p.resolve())
    except OSError:
        return p
    if s.startswith("\\\\"):
        return Path("\\\\?\\UNC\\" + s[2:])
    return Path("\\\\?\\" + s)


if long_path is None:      # pragma: no cover
    long_path = _long_path_fallback

    def candidate_roots(extra=None):
        return iter(())


def die(msg: str, code: int) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(code)


# --- where is the store ------------------------------------------------------

def find_store() -> Path | None:
    """The synced folder carrying STORE_MARKER, or None.

    NTT_PROJECTS_STORE overrides it: tests, and a machine where the store is
    reached some other way. Otherwise every OneDrive mount is checked, and one
    level inside each, because a shortcut can land the store as the mount itself
    or as a folder directly under a synced parent.
    """
    env = os.environ.get("NTT_PROJECTS_STORE")
    if env:
        p = Path(env)
        return p if (p / STORE_MARKER).is_file() else None
    for cand in candidate_roots():
        try:
            if (cand / STORE_MARKER).is_file():
                return cand
        except OSError:
            continue
    return None


# --- who is saving ------------------------------------------------------------

def _windows_name(fmt: int) -> str:
    if os.name != "nt":
        return ""
    try:
        import ctypes
        secur32 = ctypes.WinDLL("secur32")
        size = ctypes.c_ulong(0)
        secur32.GetUserNameExW(fmt, None, ctypes.byref(size))
        if not size.value:
            return ""
        buf = ctypes.create_unicode_buffer(size.value)
        return buf.value if secur32.GetUserNameExW(fmt, buf, ctypes.byref(size)) else ""
    except (OSError, AttributeError):
        return ""


def _onedrive_accounts() -> list[dict]:
    if os.name != "nt":
        return []
    try:
        import winreg
    except ImportError:
        return []
    out = []
    base = r"Software\Microsoft\OneDrive\Accounts"
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, base) as root:
            i = 0
            while True:
                try:
                    name = winreg.EnumKey(root, i)
                except OSError:
                    break
                i += 1
                if not name.lower().startswith("business"):
                    continue
                rec = {}
                try:
                    with winreg.OpenKey(root, name) as k:
                        for field in ("UserEmail", "UserName", "UserFolder"):
                            try:
                                rec[field] = winreg.QueryValueEx(k, field)[0]
                            except OSError:
                                rec[field] = ""
                except OSError:
                    continue
                out.append(rec)
    except OSError:
        pass
    return out


def identity(store: Path | None = None) -> dict:
    """Who a record would name. OneDrive first: it is the account SharePoint sees.

    With several business accounts, the one whose OneDrive folder holds the store
    is the one that uploads it -- that is the account the server will stamp.
    """
    # A signed-out or half-added account leaves its registry key behind with no
    # values at all (`Business2` on the machine this was found on). It can name
    # nobody, but it was still COUNTED -- which killed the single-account
    # fallback below, so a store outside the OneDrive folder produced an empty
    # approver and a false "different accounts" warning (2026-09-20).
    accounts = [a for a in _onedrive_accounts() if (a.get("UserEmail") or "").strip()]
    chosen = {}
    if store is not None:
        s = str(store).lower()
        for a in accounts:
            if a.get("UserFolder") and s.startswith(str(a["UserFolder"]).lower()):
                chosen = a
                break
    if not chosen and len(accounts) == 1:
        chosen = accounts[0]
    email = (chosen.get("UserEmail") or "").strip()
    upn = _windows_name(8)
    return {
        "email": email,
        "name": (chosen.get("UserName") or _windows_name(3) or "").strip(),
        "windows_upn": upn,
        # Case-insensitive: the same mailbox came back as Oner.Ozturk@ from
        # OneDrive and oner.ozturk@ from Windows on the machine this was built on.
        "identity_consistent": bool(email and upn and email.lower() == upn.lower()),
    }


# --- the record ---------------------------------------------------------------

# SharePoint REWRITES every Office file it stores: it injects its own Document
# ID and content-type metadata (docProps/custom.xml, customXml/item*, and the
# _rels that point at them) and repacks the zip. Measured 2026-09-20 on the
# first real document in the store -- 60327 bytes became 70250 within seconds
# of the save, while word/document.xml stayed byte-identical.
#
# A raw hash therefore reports every Word file in the store as edited after
# approval, which is both false and exactly the alarm nobody may learn to
# ignore. So an Office package also carries a CONTENT hash: the main part
# directory (word/, xl/, ppt/) minus its _rels, which is the document and its
# resources. SharePoint does not touch those; Word editing the document does.
OPC_MAIN = {".docx": "word", ".xlsx": "xl", ".pptx": "ppt"}


def content_sha256(path: Path) -> str | None:
    """Hash of the document inside an Office package, or None for a plain file."""
    main = OPC_MAIN.get(path.suffix.lower())
    if main is None:
        return None
    try:
        with zipfile.ZipFile(long_path(path)) as z:
            names = sorted(n for n in z.namelist()
                           if n.startswith(main + "/")
                           and not n.startswith(main + "/_rels/"))
            if not names:
                return None
            h = hashlib.sha256()
            for n in names:
                h.update(n.encode("utf-8"))
                h.update(b"|")
                h.update(z.read(n))
            return h.hexdigest()
    except (OSError, zipfile.BadZipFile):
        return None

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(long_path(path), "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def read_pin(project: Path) -> dict:
    pin = {}
    f = project / PIN_NAME
    if not f.is_file():
        return pin
    for line in f.read_text(encoding="utf-8", errors="replace").splitlines():
        m = re.match(r"^(project|catalog|profile):\s*(\S+)\s*$", line)
        if m:
            pin[m.group(1)] = m.group(2)
    return pin


def code_from_pin(project: Path) -> str:
    """The project code, from the workspace pin and nowhere else."""
    pin = read_pin(project)
    code = (pin.get("project") or "").strip().lower()
    if not code:
        die(f"{project} is not installed for a central project -- its "
            f"{PIN_NAME} carries no `project:`. NOTHING was saved. Install the "
            f"folder for its project (the brief writes the code), then retry. A "
            f"folder with no project has no place in the store.", EXIT_NO_CODE)
    if not CODE_RE.match(code):
        die(f"the pin names {code!r}, which is not a valid project code", EXIT_REFUSED)
    return code


def list_path(store: Path, code: str) -> Path:
    return store / code / LIST_NAME


def read_list(store: Path, code: str) -> dict | None:
    """The project's development list, or None when nobody has loaded one.

    It lives in the STORE, not in the project brief. The brief ships with the
    catalog, and a new catalog stamp rewrites every installed skill on every
    machine -- the price `library-match` already pays for a yearly refresh. This
    list follows Orbit and will move weekly, so it rides OneDrive instead: one
    file, reaching everyone, with no release and no version bump.
    """
    f = list_path(store, code)
    if not long_path(f).is_file():
        return None
    try:
        data = json.loads(long_path(f).read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        # Refuse rather than fall back. A list that fails to parse would
        # otherwise route every document to UNLISTED and look like policy.
        die(f"{f} cannot be read ({exc}). NOTHING was saved.", EXIT_USAGE)
    if not isinstance(data, dict) or not isinstance(data.get("items"), list):
        die(f"{f} has no `items` list. NOTHING was saved.", EXIT_USAGE)
    return data


def list_kinds(lst: dict | None) -> tuple:
    """The kind vocabulary. Fixed, never free text: `Test`, `Testler` and
    `test-dokumani` would otherwise become three folders for one deliverable."""
    if lst:
        ks = tuple(str(k).strip() for k in (lst.get("kinds") or []) if str(k).strip())
        if ks:
            return ks
    return DEFAULT_KINDS


def resolve_kind(kinds: tuple, wanted: str) -> str:
    for k in kinds:
        if k.lower() == wanted.strip().lower():
            return k            # the vocabulary's own spelling wins
    die(f"--kind must be one of: {', '.join(kinds)}", EXIT_USAGE)


def find_item(lst: dict, wanted: str) -> tuple[str, str] | None:
    """The list's own spelling of an id and its title, or None.

    Case-insensitive and NEVER fuzzy. Title similarity would file a document
    under the wrong development quietly; the consultant picks, the tool obeys.
    """
    w = wanted.strip().lower()
    for it in lst.get("items", []):
        if isinstance(it, dict) and str(it.get("id") or "").strip().lower() == w:
            return str(it["id"]).strip(), str(it.get("title") or "")
    return None


def item_ids(lst: dict | None) -> set:
    if not lst:
        return set()
    return {str(i.get("id") or "").strip().lower()
            for i in lst.get("items", []) if isinstance(i, dict)}

def next_version(folder: Path, stem: str) -> tuple[int, str]:
    """Never overwrite an approved record: the next free version wins.

    v1 is the bare stem, so the first approval reads as the document's own name;
    later ones are <stem>-v2, -v3.
    """
    if not (long_path(folder / (stem + RECORD_SUFFIX))).exists():
        return 1, stem
    n = 2
    while (long_path(folder / f"{stem}-v{n}{RECORD_SUFFIX}")).exists():
        n += 1
    return n, f"{stem}-v{n}"


def cmd_where(args) -> int:
    store = find_store()
    if store is None:
        # Two causes, one message: not synced, or synced but unmarked. Only a
        # maintainer meets the second, but on 2026-09-16 this printed NOT SYNCED
        # for a folder that plainly was.
        print("project store: NOT FOUND on this machine.")
        print("  Either the Projects folder is not synced here (add it with")
        print("  OneDrive shortcut - the setup document has the link), or it is")
        print(f"  synced but not yet marked ({STORE_MARKER}).")
        return EXIT_NOT_SYNCED
    print(f"project store: {store}")
    return 0


def cmd_whoami(args) -> int:
    ident = identity(find_store())
    print(json.dumps(ident, ensure_ascii=False, indent=2))
    if not ident["email"]:
        print("WARNING: no OneDrive business account found -- a record would name "
              "nobody the server can corroborate.", file=sys.stderr)
    elif not ident["identity_consistent"]:
        print("WARNING: OneDrive and Windows name different accounts. SharePoint "
              "will stamp the OneDrive one.", file=sys.stderr)
    return 0


def cmd_init(args) -> int:
    dest = Path(args.dest)
    if not dest.is_dir():
        die(f"{dest} is not a folder", EXIT_USAGE)
    marker = dest / STORE_MARKER
    if marker.exists():
        print(f"already a project store: {dest}")
        return 0
    marker.write_text(json.dumps({"schema": 2, "kinds": list(DEFAULT_KINDS)}, indent=2),
                      encoding="utf-8")
    print(f"marked as the project store: {dest}")
    return 0


def cmd_save(args) -> int:
    # The gate. Everything below writes into a folder the whole department reads.
    if not args.approved:
        die("refusing to save without --approved. Ask the person, show them what "
            "will be saved and where, and pass it only after an explicit yes.",
            EXIT_REFUSED)
    project = Path(args.project or os.getcwd())
    pin = read_pin(project)
    # The PIN is the only source of the project code, and that is the whole rule:
    # the store holds documents of projects that HAVE a recipe. ntt-skill-setup
    # writes `project:` into the pin from a central brief and records the brief's
    # own hash beside it, so a code here cannot be invented. --code used to accept
    # any slug, which would have opened a folder for a project that does not exist
    # -- caught before a single real document was saved (2026-09-20).
    if args.code:
        die("--code is not accepted: the project comes from the workspace's "
            ".ntt-profile.yaml, so only a project installed with its central brief "
            "can be saved to. Install this folder for that project, or point "
            "--project at the folder that already is.", EXIT_REFUSED)
    code = code_from_pin(project)

    files = [Path(f) for f in args.file]
    for f in files:
        if not f.is_file():
            die(f"{f} does not exist", EXIT_USAGE)

    store = find_store()
    if store is None:
        print("project store: NOT SYNCED -- nothing saved. Sync the 'Projects' "
              "folder (the setup document has the link) and run this again.",
              file=sys.stderr)
        return EXIT_NOT_SYNCED

    # One folder per development item, a kind folder always inside it. The work
    # ships per item -- Beta Enerji alone carries six deliverables for one --
    # so splitting an item across <code>/FS and <code>/TS filed one job twice.
    lst = read_list(store, code)
    kind = resolve_kind(list_kinds(lst), args.kind)
    wanted = (args.item or "").strip()
    if wanted and not ITEM_RE.match(wanted):
        die(f"{wanted!r} is not a usable item id (letters, digits, . _ -, at "
            f"most 25 characters). NOTHING was saved.", EXIT_USAGE)

    if lst is None:
        # No list loaded: everything collects in one place, by decision. The id
        # is still RECORDED when given, which is what lets `reconcile` move the
        # document later without anyone guessing where it belonged.
        folder_item, recorded, title = None, (wanted or None), ""
    elif not wanted:
        folder_item, recorded, title = None, None, ""
    else:
        hit = find_item(lst, wanted)
        if hit is None:
            print(f"{wanted!r} is not in the development list for '{code}'. "
                  f"NOTHING was saved.", file=sys.stderr)
            print(f"  A typo must not open a folder, and it must not quietly "
                  f"land in {UNLISTED} either. Pick an id from `items`, or omit "
                  f"--item to file it under {UNLISTED} on purpose.", file=sys.stderr)
            return EXIT_UNKNOWN_ITEM
        folder_item, title = hit
        recorded = folder_item

    folder = store / code / (folder_item or UNLISTED) / kind
    long_path(folder).mkdir(parents=True, exist_ok=True)
    stem = files[0].stem
    version, base = next_version(folder, stem)

    saved = []
    for f in files:
        target = folder / f"{base}{f.suffix}"
        shutil.copy2(long_path(f), long_path(target))
        entry = {"name": target.name, "sha256": sha256(target),
                 "bytes": long_path(target).stat().st_size}
        ch = content_sha256(target)
        if ch:
            entry["content_sha256"] = ch
        saved.append(entry)

    ident = identity(store)
    record = {
        "schema": 2,
        "project": code,
        # The item this belongs to, as the consultant named it. Kept even when
        # the document lands in UNLISTED -- that is what `reconcile` reads.
        "item": recorded,
        "item_title": title,
        "kind": kind,
        "version": version,
        "approved": {
            "by_email": ident["email"],
            "by_name": ident["name"],
            "windows_upn": ident["windows_upn"],
            "identity_consistent": ident["identity_consistent"],
            "at_utc": _dt.datetime.now(_dt.timezone.utc).replace(microsecond=0).isoformat(),
            # What --approved asserts, recorded so a reader knows what was claimed.
            "confirmed_interactively": True,
        },
        "files": saved,
        # The workspace FOLDER NAME only: an absolute path carries the consultant's
        # Windows user name into a folder the whole department can read.
        "source": {"skill": args.skill or "", "workspace": project.name,
                   "catalog": pin.get("catalog", "")},
    }
    rec_path = folder / f"{base}{RECORD_SUFFIX}"
    long_path(rec_path).write_text(json.dumps(record, ensure_ascii=False, indent=2),
                                   encoding="utf-8")

    where = f"{code}/{folder_item}" if folder_item else f"{code}/{UNLISTED}"
    print(f"saved {kind} v{version} under {where}:")
    for s in saved:
        print(f"  {folder / s['name']}")
    print(f"  record: {rec_path}")
    print(f"  approved by: {ident['name']} <{ident['email']}>")
    if not ident["identity_consistent"]:
        print("  WARNING: OneDrive and Windows name different accounts.")
    if folder_item is None:
        if lst is None:
            print(f"  NOTE: no development list loaded for '{code}' -- filed "
                  f"under {UNLISTED}. `reconcile` moves it once one is loaded"
                  + ("." if recorded else ", but only if an --item was named."))
        else:
            print(f"  NOTE: no --item given -- filed under {UNLISTED}.")
    return 0


def _store_and_code(args) -> tuple[Path, str]:
    store = find_store()
    if store is None:
        print("project store: NOT SYNCED on this machine.", file=sys.stderr)
        sys.exit(EXIT_NOT_SYNCED)
    return store, code_from_pin(Path(args.project or os.getcwd()))


def cmd_items(args) -> int:
    store, code = _store_and_code(args)
    lst = read_list(store, code)
    if lst is None:
        print(f"no development list loaded for '{code}'.")
        print(f"  Everything is filed under {UNLISTED}/<KIND>/ until one is.")
        print(f"  Load it here: {list_path(store, code)}")
        print('  Shape: {"items": [{"id": "SD007", "title": "..."}], '
              '"kinds": ["FS", "TS"]}')
        return 0
    items = [i for i in lst["items"] if isinstance(i, dict)]
    print(f"development list for '{code}': {len(items)} item(s)"
          + (f", generated {lst['generated']}" if lst.get("generated") else ""))
    for it in items:
        print(f"  {str(it.get('id') or ''):<12} {it.get('title') or ''}")
    print(f"kinds: {', '.join(list_kinds(lst))}")
    return 0


def cmd_reconcile(args) -> int:
    """Move what is in UNLISTED into its item folder, once the list names it.

    Safe to do at all because a record names FILES, never paths, and sits beside
    them -- so a moved set still verifies. That is what makes "no list yet, put
    it all in one folder" a reversible decision instead of a debt.
    """
    store, code = _store_and_code(args)
    lst = read_list(store, code)
    root = store / code
    if lst is None:
        print(f"no development list loaded for '{code}' -- nothing to reconcile.")
        return 0

    moves, no_item, unknown, blocked = [], [], [], []
    unl = root / UNLISTED
    if unl.is_dir():
        for rec in sorted(unl.rglob("*" + RECORD_SUFFIX)):
            try:
                data = json.loads(rec.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                blocked.append((rec.name, "record unreadable"))
                continue
            named = (data.get("item") or "").strip()
            if not named:
                no_item.append(rec.relative_to(root))
                continue
            hit = find_item(lst, named)
            if hit is None:
                unknown.append((rec.relative_to(root), named))
                continue
            dest = root / hit[0] / rec.parent.name
            names = [f["name"] for f in data.get("files", [])] + [rec.name]
            clash = [n for n in names if long_path(dest / n).exists()]
            if clash:
                # Never overwrite an approved file; the whole set stays put.
                blocked.append((rec.name, f"{dest.name}/ already has {clash[0]}"))
                continue
            moves.append((rec.parent, dest, names, hit[0]))

    known = item_ids(lst)
    orphans = sorted(d.name for d in root.iterdir()
                     if d.is_dir() and d.name != UNLISTED
                     and d.name.lower() not in known)

    for src, dest, names, iid in moves:
        print(f"  MOVE  {src.relative_to(root)}/ -> {iid}/{dest.name}/  "
              f"({len(names)} file(s))")
    for rel in no_item:
        print(f"  STAY  {rel}  (no item recorded)")
    for rel, named in unknown:
        print(f"  STAY  {rel}  (recorded item {named!r} is not in the list)")
    for name, why in blocked:
        print(f"  SKIP  {name}  ({why})")
    for name in orphans:
        # Reported, never touched: a renamed or deleted Orbit item must not
        # take a folder of approved documents with it.
        print(f"  ORPHAN  {name}/  is not in the list -- left untouched")

    if not moves:
        print("nothing to move.")
        return 0
    if not args.apply:
        print(f"{len(moves)} set(s) would move. Re-run with --apply.")
        return 0

    done = 0
    for src, dest, names, _ in moves:
        long_path(dest).mkdir(parents=True, exist_ok=True)
        for n in names:
            shutil.move(str(long_path(src / n)), str(long_path(dest / n)))
        done += 1
        if not any(src.iterdir()):
            src.rmdir()
    print(f"moved {done} set(s).")
    return 0

def cmd_assign(args) -> int:
    """Name the item for a set that was saved before the list existed.

    Filing metadata only. It never touches `approved` or `files`: who approved
    which bytes and when is the record's point, and that answer does not change
    because the folder did. Refuses a record that already names an item -- being
    able to re-file an approved document under a different development would
    undo the reason the id is not free text in the first place.
    """
    store, code = _store_and_code(args)
    lst = read_list(store, code)
    if lst is None:
        die(f"no development list loaded for '{code}' -- nothing to assign to.",
            EXIT_USAGE)
    rec = Path(args.record)
    if not long_path(rec).is_file():
        die(f"{rec} does not exist", EXIT_USAGE)
    data = json.loads(long_path(rec).read_text(encoding="utf-8"))
    if (data.get("item") or "").strip():
        die(f"this record already names item {data['item']!r}. Re-filing an "
            f"approved document under a different development is not a "
            f"correction; save it again under the right item.", EXIT_REFUSED)
    hit = find_item(lst, args.item)
    if hit is None:
        print(f"{args.item!r} is not in the development list for '{code}'.",
              file=sys.stderr)
        return EXIT_UNKNOWN_ITEM
    ident = identity(store)
    data["item"], data["item_title"] = hit
    data["item_assigned"] = {
        "by_email": ident["email"],
        "at_utc": _dt.datetime.now(_dt.timezone.utc).replace(
            microsecond=0).isoformat(),
    }
    long_path(rec).write_text(json.dumps(data, ensure_ascii=False, indent=2),
                              encoding="utf-8")
    print(f"{rec.name}: item set to {hit[0]}")
    print("  run `reconcile --apply` to move it into that folder.")
    return 0

def cmd_verify(args) -> int:
    rec_path = Path(args.record)
    if not long_path(rec_path).is_file():
        die(f"{rec_path} does not exist", EXIT_USAGE)
    record = json.loads(long_path(rec_path).read_text(encoding="utf-8"))
    folder = rec_path.parent
    bad = 0
    for entry in record.get("files", []):
        f = folder / entry["name"]
        if not long_path(f).is_file():
            print(f"  MISSING  {entry['name']}")
            bad += 1
        elif sha256(f) == entry["sha256"]:
            print(f"  ok       {entry['name']}")
        elif (entry.get("content_sha256")
              and content_sha256(f) == entry["content_sha256"]):
            # The bytes moved, the document did not: SharePoint stamped its
            # own metadata into the package. Not an edit, and saying so keeps
            # a real CHANGED meaning something.
            print(f"  ok       {entry['name']}  (SharePoint metadata added; "
                  f"document unchanged)")
        else:
            print(f"  CHANGED  {entry['name']}  (edited after approval)")
            bad += 1
    appr = record.get("approved", {})
    print(f"approved v{record.get('version')} by {appr.get('by_name')} "
          f"<{appr.get('by_email')}> at {appr.get('at_utc')}")
    if bad:
        print(f"NOT AS APPROVED: {bad} file(s) differ from the record.")
        return EXIT_MISMATCH
    print("as approved.")
    return 0


def main() -> int:
    _console()
    ap = argparse.ArgumentParser(description="Approved project documents, in one place.")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("where").set_defaults(func=cmd_where)
    sub.add_parser("whoami").set_defaults(func=cmd_whoami)
    p = sub.add_parser("init"); p.add_argument("--dest", required=True)
    p.set_defaults(func=cmd_init)
    p = sub.add_parser("save")
    p.add_argument("--kind", required=True)
    p.add_argument("--file", action="append", required=True)
    p.add_argument("--project")
    p.add_argument("--code", help="refused: the project comes from the pin")
    p.add_argument("--skill")
    p.add_argument("--item", help="development item id, from `items`")
    p.add_argument("--approved", action="store_true")
    p.set_defaults(func=cmd_save)
    p = sub.add_parser("items"); p.add_argument("--project")
    p.set_defaults(func=cmd_items)
    p = sub.add_parser("assign"); p.add_argument("--project")
    p.add_argument("--record", required=True)
    p.add_argument("--item", required=True)
    p.set_defaults(func=cmd_assign)
    p = sub.add_parser("reconcile"); p.add_argument("--project")
    p.add_argument("--apply", action="store_true",
                   help="actually move; without it, only the plan is printed")
    p.set_defaults(func=cmd_reconcile)
    p = sub.add_parser("verify"); p.add_argument("--record", required=True)
    p.set_defaults(func=cmd_verify)
    args = ap.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
