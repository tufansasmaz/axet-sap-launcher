#!/usr/bin/env python3
"""A minimal Orbit client: the consultant's own session, standard library only.

Orbit is NTT's Plane fork. There is no API key yet (2026-09-24 decision): a
consultant signs in once through `orbit-mcp login` (or the Orbit PMO panel's
`npm run login`), which stores the web session cookie in
`~/.orbit-mcp/session.json` -- DPAPI-encrypted on Windows. This module reads
that file, so every write carries the person's own identity and Orbit's activity
log names them, not a service account.

No URL, tenant or key lives here (house rule): the base URL and workspace come
from the session file, which the person created by signing in.

The internal API (`/api/workspaces/<ws>/...`) has no published contract. What is
used here was measured against Orbit on 2026-09-28: work item links are
`/issues/<id>/issue-links/`, the page tree is `/pages/?parent_id=`, and a
project's `identifier` is the key prefix (PRJK).
"""
from __future__ import annotations

import base64
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

SESSION = Path.home() / ".orbit-mcp" / "session.json"
TIMEOUT_S = 120


class OrbitError(Exception):
    """Orbit answered, but not with what was asked for."""

    def __init__(self, msg: str, status: int | None = None):
        super().__init__(msg)
        self.status = status


class NoSession(OrbitError):
    """No usable session: the person has to sign in again."""


class NoAccess(OrbitError):
    """Signed in, but this account may not touch that project or item."""


LOGIN_HINT = ("Sign in to Orbit once on this machine: `npx orbit-mcp login` "
              "(or the Orbit PMO panel's `npm run login`), then retry.")


def _dpapi_unprotect(blob: bytes) -> bytes:
    """CryptUnprotectData for the current user, through ctypes (no pywin32)."""
    import ctypes
    from ctypes import wintypes

    class BLOB(ctypes.Structure):
        _fields_ = [("cbData", wintypes.DWORD), ("pbData", ctypes.POINTER(ctypes.c_char))]

    buf = ctypes.create_string_buffer(blob, len(blob))
    src = BLOB(len(blob), ctypes.cast(buf, ctypes.POINTER(ctypes.c_char)))
    out = BLOB()
    if not ctypes.windll.crypt32.CryptUnprotectData(
            ctypes.byref(src), None, None, None, None, 0, ctypes.byref(out)):
        raise NoSession("the Orbit session could not be decrypted on this account "
                        "(was it created by another Windows user?)")
    try:
        return ctypes.string_at(out.pbData, out.cbData)
    finally:
        ctypes.windll.kernel32.LocalFree(out.pbData)


def read_session(path: Path = SESSION) -> dict:
    """The stored session: baseUrl, workspace, email, cookie."""
    if not path.is_file():
        raise NoSession("no Orbit session on this machine. " + LOGIN_HINT)
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        if raw.get("korumali") is True and isinstance(raw.get("veri"), str):
            raw = json.loads(_dpapi_unprotect(base64.b64decode(raw["veri"])).decode("utf-8"))
    except NoSession:
        raise
    except (OSError, ValueError) as exc:
        raise NoSession(f"the Orbit session file cannot be read ({exc}). " + LOGIN_HINT) from exc
    if not raw.get("cookie") or not raw.get("baseUrl") or not raw.get("workspace"):
        raise NoSession("the Orbit session file is incomplete. " + LOGIN_HINT)
    return raw



class Orbit:
    def __init__(self, session: dict | None = None):
        s = session or read_session()
        self.base = s["baseUrl"].rstrip("/")
        self.ws = s["workspace"]
        self.email = s.get("email", "")
        self._cookie = s["cookie"]

    # --- paths ---------------------------------------------------------------
    def ws_path(self, rest: str) -> str:
        return f"/api/workspaces/{self.ws}{rest}"

    def project_path(self, pid: str, rest: str) -> str:
        return self.ws_path(f"/projects/{pid}{rest}")

    def page_url(self, pid: str, page_id: str) -> str:
        return f"{self.base}/{self.ws}/projects/{pid}/pages/{page_id}/"

    def item_url(self, key: str) -> str:
        return f"{self.base}/{self.ws}/browse/{key}/"

    # --- transport -----------------------------------------------------------
    def request(self, method: str, path: str, query: dict | None = None, body=None):
        url = self.base + path
        if query:
            url += "?" + urllib.parse.urlencode({k: v for k, v in query.items() if v is not None})
        data = None
        headers = {"Accept": "application/json", "Cookie": self._cookie,
                   "Referer": self.base + "/"}
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        if method != "GET":
            # Django's CSRF check on a cookie session: the token cookie echoed back.
            for part in self._cookie.split(";"):
                k, _, v = part.strip().partition("=")
                if k == "csrftoken":
                    headers["X-CSRFToken"] = v
        req = urllib.request.Request(url, data=data, method=method, headers=headers)
        opener = urllib.request.build_opener(_NoRedirect())
        try:
            with opener.open(req, timeout=TIMEOUT_S) as r:
                text = r.read().decode("utf-8")
                ctype = r.headers.get("Content-Type", "")
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "replace")[:300]
            if exc.code == 401 or 300 <= exc.code < 400:
                raise NoSession("the Orbit session has expired. " + LOGIN_HINT, exc.code) from None
            if exc.code == 403:
                raise NoAccess(f"Orbit refused access ({path.split('/api/')[-1][:80]})", 403) from None
            try:
                j = json.loads(detail)
                detail = str(j.get("error") or j.get("detail") or detail)
            except ValueError:
                pass
            raise OrbitError(f"Orbit {exc.code}: {detail}", exc.code) from None
        except urllib.error.URLError as exc:
            raise OrbitError(f"Orbit could not be reached: {exc.reason}") from None
        if not text:
            return None
        if "application/json" not in ctype:
            raise NoSession("Orbit answered with a page instead of data. " + LOGIN_HINT)
        return json.loads(text)

    def get(self, path, **query):
        return self.request("GET", path, query or None)

    def results(self, path, **query) -> list:
        v = self.get(path, **query)
        if isinstance(v, list):
            return v
        return (v or {}).get("results") or []

    # --- what the kit needs ----------------------------------------------------
    def project_by_identifier(self, ident: str) -> dict:
        for p in self.results(self.ws_path("/projects/")):
            if str(p.get("identifier", "")).upper() == ident.upper():
                return p
        raise NoAccess(f"no Orbit project {ident!r} visible to {self.email or 'this account'}")

    def item_by_key(self, key: str) -> dict:
        return self.get(self.ws_path(f"/work-items/{key.upper()}/"))

    def child_pages(self, pid: str, parent_id: str) -> list:
        return self.results(self.project_path(pid, "/pages/"), type="public",
                            order_by="manual", per_page=100, cursor="100:0:0",
                            parent_id=parent_id)

    def top_pages(self, pid: str) -> list:
        return self.results(self.project_path(pid, "/pages/"), type="public",
                            order_by="manual", per_page=100, cursor="100:0:0")


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """A redirect from the API means the session went to the login page."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.error.HTTPError(req.full_url, code, msg, headers, fp)


if __name__ == "__main__":      # pragma: no cover - a quick "am I signed in"
    for _s in (sys.stdout, sys.stderr):
        try:        # a cp1252 console cannot print a Turkish page title
            _s.reconfigure(errors="replace") if _s.isatty() else _s.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError, OSError):
            pass
    try:
        o = Orbit()
        print(f"signed in to {o.base} ({o.ws}) as {o.email or '?'}")
    except OrbitError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(3)
