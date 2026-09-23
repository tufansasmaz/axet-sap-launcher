#!/usr/bin/env python3
"""Repair an aXet.code session whose stored history rejects every request.

The symptom is a 400 on every message to one session:

    unexpected `tool_use_id` found in `tool_result` blocks: toolu_...
    Each `tool_result` block must have a corresponding `tool_use` block

Cause (established 2026-09-21 by SQLite forensics on two independently broken
sessions, Dogukan Durak): aXet.code stores a turn as an assistant message
carrying `tool_call` parts, then a `tool` message carrying the matching
`tool_result`. When the gateway errors mid-stream the client can run the tool
and persist its result while DROPPING the assistant message that held the
matching call. What is left is an orphaned `tool_result`. Every later request
replays the whole history, so the session is stuck for good -- the damage is on
disk, not in live state.

**Not caused by parallel tool-calls or by interrupting a call.** That was the
first theory and the forensics disproved it. Those are real but separate.

Repair: insert a synthetic assistant message carrying a `tool_call` with the
orphan's id, placed BEFORE it. Nothing is deleted; the tool output itself is
kept, which an earlier fix that deleted the orphan did not manage.

This script WRITES to the agent host's own database -- the only thing in this
kit that does. So it backs up first, refuses a schema it does not recognise,
and reports rather than guesses.

Python stdlib only.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sqlite3
import sys
import time
import uuid
from pathlib import Path

DB_NAME = "axet-code.db"
HOST_DIR = ".axet-code"
EXIT_OK, EXIT_USAGE, EXIT_NO_DB, EXIT_SCHEMA, EXIT_INCOMPLETE = 0, 2, 3, 4, 5

# What this script understands. The schema belongs to aXet.code and can change
# in any release; a repair that guesses at an unfamiliar shape would write
# nonsense into a store holding every session the consultant has. So the shape
# is asserted, and an unknown one stops the run.
NEEDED_TABLES = {"messages", "sessions"}
NEEDED_COLUMNS = {"id", "session_id", "role", "parts", "created_at", "updated_at"}


def console() -> None:
    """cp1254/cp857 consoles cannot print a Turkish path; see ntt_setup."""
    for stream in (sys.stdout, sys.stderr):
        try:
            if stream.isatty():
                stream.reconfigure(errors="replace")
            else:
                stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError, OSError):
            pass


def die(msg: str, code: int) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(code)


def find_db(explicit: str | None, project: str | None) -> Path:
    """The session store: named, else this project's, else the user's own."""
    if explicit:
        p = Path(explicit)
        if not p.is_file():
            die(f"{p} does not exist", EXIT_NO_DB)
        return p
    here = Path(project or os.getcwd()) / HOST_DIR / DB_NAME
    if here.is_file():
        return here
    local = os.environ.get("LOCALAPPDATA")
    if local:
        glob = Path(local) / "axet-code" / DB_NAME
        if glob.is_file():
            return glob
    die(f"no {DB_NAME} found. Looked in {here} and the user's axet-code folder. "
        f"Pass --db with the path.", EXIT_NO_DB)


def check_schema(conn: sqlite3.Connection) -> None:
    names = {r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'")}
    missing = NEEDED_TABLES - names
    if missing:
        die(f"this database has no {', '.join(sorted(missing))} table, so it is "
            f"not an aXet.code session store this script understands. Nothing "
            f"was changed.", EXIT_SCHEMA)
    cols = {r[1] for r in conn.execute("PRAGMA table_info(messages)")}
    missing = NEEDED_COLUMNS - cols
    if missing:
        die(f"the messages table is missing {', '.join(sorted(missing))}. The "
            f"aXet.code schema has changed and this repair no longer matches "
            f"it. Nothing was changed -- report it rather than forcing it.",
            EXIT_SCHEMA)


def find_orphans(conn: sqlite3.Connection, session_id: str) -> list[dict]:
    """tool_result parts whose tool_call_id no EARLIER message opened.

    Walked in the order the client replays: created_at, then rowid. A result
    that precedes its own call is exactly as broken as one with no call at all,
    and this ordering catches both.
    """
    rows = conn.execute(
        "SELECT rowid, id, role, created_at, parts FROM messages "
        "WHERE session_id=? ORDER BY created_at ASC, rowid ASC",
        (session_id,)).fetchall()
    known: set[str] = set()
    orphans: list[dict] = []
    prev_created_at = None
    for rowid, msg_id, role, created_at, parts_raw in rows:
        try:
            parts = json.loads(parts_raw)
        except (TypeError, ValueError):
            parts = []
        if not isinstance(parts, list):
            parts = []
        if role == "tool":
            for part in parts:
                if not isinstance(part, dict) or part.get("type") != "tool_result":
                    continue
                data = part.get("data") or {}
                tcid = data.get("tool_call_id")
                if tcid and tcid not in known:
                    orphans.append({"rowid": rowid, "msg_id": msg_id,
                                    "tool_call_id": tcid, "name": data.get("name"),
                                    "created_at": created_at,
                                    "prev_created_at": prev_created_at})
        for part in parts:
            if isinstance(part, dict) and part.get("type") == "tool_call":
                tid = (part.get("data") or {}).get("id")
                if tid:
                    known.add(tid)
        prev_created_at = created_at
    return orphans


def repair(conn: sqlite3.Connection, session_id: str, orphans: list[dict]) -> int:
    c = conn.cursor()
    done = 0
    for o in orphans:
        # `created_at` is whole seconds and the client orders by
        # (created_at, rowid). A row inserted now always takes the HIGHER
        # rowid, so the placeholder can only win on created_at -- one second
        # earlier does it.
        #
        # Unless the previous message already sits in that second: then there
        # is no room below and the ORPHAN is nudged one second forward instead.
        # That rewrites one integer on one row and never its content, and it is
        # the case that actually occurs -- the original script placed the
        # placeholder in the SAME second every time, lost the rowid tiebreak,
        # and silently repaired nothing (measured 2026-09-22).
        synth = o["created_at"] - 1
        if o["prev_created_at"] is not None and synth < o["prev_created_at"]:
            synth = o["created_at"]
            c.execute("UPDATE messages SET created_at=? WHERE rowid=?",
                      (o["created_at"] + 1, o["rowid"]))
        parts = [{"type": "tool_call",
                  "data": {"id": o["tool_call_id"], "name": o["name"] or "unknown",
                           "input": json.dumps({"note": "recovered placeholder - "
                                                "the original tool_call arguments "
                                                "were lost when the assistant "
                                                "message failed to persist"}),
                           "provider_executed": False, "finished": True}}]
        c.execute(
            "INSERT INTO messages (id, session_id, role, parts, model, created_at,"
            " updated_at, finished_at, provider, is_summary_message)"
            " VALUES (?, ?, 'assistant', ?, NULL, ?, ?, ?, NULL, 0)",
            (str(uuid.uuid4()), session_id, json.dumps(parts), synth, synth, synth))
        done += 1
        print(f"  placeholder for {o['tool_call_id']} (tool={o['name']}) at {synth}")
    return done


def main() -> int:
    console()
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--db", help="session store; default: this project's, then the user's")
    ap.add_argument("--project", help="project folder to look in (default: cwd)")
    ap.add_argument("--session", help="one session id; default: the recent ones")
    ap.add_argument("--scan-last", type=int, default=8,
                    help="how many recently used sessions to scan (default 8)")
    ap.add_argument("--apply", action="store_true",
                    help="write the repair; without it nothing is changed")
    args = ap.parse_args()

    db = find_db(args.db, args.project)
    print(f"session store: {db}")
    try:
        conn = sqlite3.connect(db)
    except sqlite3.Error as exc:
        die(f"cannot open {db}: {exc}", EXIT_NO_DB)
    check_schema(conn)

    if args.session:
        sessions = [args.session]
    else:
        sessions = [r[0] for r in conn.execute(
            "SELECT id FROM sessions ORDER BY updated_at DESC LIMIT ?",
            (args.scan_last,))]

    found = {s: o for s in sessions for o in [find_orphans(conn, s)] if o}
    if not found:
        print("no orphaned tool_result rows found - nothing to repair.")
        return EXIT_OK

    total = 0
    for sid, orphans in found.items():
        print(f"session {sid}: {len(orphans)} orphan(s)")
        for o in orphans:
            print(f"  rowid={o['rowid']} {o['tool_call_id']} tool={o['name']}")
        total += len(orphans)
    if not args.apply:
        print(f"{total} orphan(s). Nothing written. Re-run with --apply.")
        return EXIT_OK

    backup = Path(f"{db}.bak-{int(time.time())}")
    shutil.copy2(db, backup)
    print(f"backup: {backup}")
    for sid, orphans in found.items():
        print(f"repairing {sid} ...")
        repair(conn, sid, orphans)
    conn.commit()

    # Verify against the SAME walk the client uses. The original script never
    # did this, so a repair that placed the placeholder on the wrong side
    # reported success.
    left = {s: o for s in found for o in [find_orphans(conn, s)] if o}
    if left:
        print(f"STILL BROKEN: {sum(len(v) for v in left.values())} orphan(s) "
              f"remain after the repair. The backup above is the state before "
              f"this run. Do not retry blindly - report it.", file=sys.stderr)
        return EXIT_INCOMPLETE
    print(f"repaired: {total} placeholder(s) inserted, 0 orphans left. "
          f"The session can be used again.")
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
