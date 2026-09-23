"""Finding a synced SharePoint folder on a consultant machine. Stdlib only.

Two skills need the same thing: the local folder that a SharePoint library is
synced into. They must not each invent it.

`project-store` learned the reliable way on 2026-09-16: ask OneDrive's own
registry which folders it syncs, then look for a folder whose CONTENT identifies
it. Guessing at shortcut spellings does not survive contact with real machines —
measured 2026-09-21, this machine's shortcuts sit directly under the OneDrive
root, not under the `Shortcuts/` subfolder a second skill had hard-coded, and
each shortcut is its own `MountPoint` with `IsFolderScope=1`.

No tenant, no site URL, no library name in here (house rule). What identifies a
folder is passed in by the caller as a predicate over its contents.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Callable, Iterator


def long_path(p: Path) -> Path:
    r"""Prefix a Windows path so MAX_PATH stops applying.

    A synced library path is long before a customer folder is added, and on
    2026-09-08 a consultant with a longer user name could not install at all for
    exactly this reason. Anything that opens a file under a synced root goes
    through here.
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


def onedrive_mounts() -> list[Path]:
    """Every folder OneDrive syncs on this machine, from its own registry.

    Each added shortcut appears as its own entry, so the list holds both the
    account root and every synced library beside it.
    """
    if os.name != "nt":
        return []
    try:
        import winreg
    except ImportError:
        return []
    out: list[Path] = []
    base = r"Software\SyncEngines\Providers\OneDrive"
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, base) as root:
            i = 0
            while True:
                try:
                    name = winreg.EnumKey(root, i)
                except OSError:
                    break
                i += 1
                try:
                    with winreg.OpenKey(root, name) as k:
                        mount, _ = winreg.QueryValueEx(k, "MountPoint")
                        if mount:
                            out.append(Path(mount))
                except OSError:
                    continue
    except OSError:
        pass
    return out


def candidate_roots(extra: list[Path] | None = None) -> Iterator[Path]:
    """Each synced mount, and one level inside it.

    One level, never a recursive sweep of the profile: a shortcut lands the
    library either as the mount itself or as a folder directly under a synced
    parent, and anything deeper is someone else's data.
    """
    seen: set[str] = set()
    for mount in list(extra or []) + onedrive_mounts():
        for cand in [mount] + ([d for d in mount.iterdir() if d.is_dir()]
                               if mount.is_dir() else []):
            key = os.path.normcase(str(cand))
            if key in seen:
                continue
            seen.add(key)
            yield cand


def find_synced(is_match: Callable[[Path], bool],
                extra: list[Path] | None = None) -> list[Path]:
    """Every synced folder whose CONTENT satisfies `is_match`.

    A list, not the first hit: two candidates mean the caller must ask rather
    than pick, and silently choosing one is how a document lands in the wrong
    library.
    """
    hits: list[Path] = []
    for cand in candidate_roots(extra):
        try:
            if is_match(cand):
                hits.append(cand)
        except OSError:
            continue
    return hits
