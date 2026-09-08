"""Drive a classic SAP GUI session through a fixed sequence and capture the
screens — in ONE invocation — then emit a manifest ready for office-tools'
office-manual (build_manual.py).

Self-contained: needs only pywin32 + Pillow. No dependency on the abapgit-deploy
scripting primitives, because OS-level driving (Win32 SendInput + PrintWindow)
needs no SAP GUI Scripting engine.

Why this exists: when SAP GUI Scripting is disabled server-side
(`sapgui/user_scripting` off), the scripting engine opens connections but never
attaches a session, so the engine can't drive anything. This script drives the
live classic GUI window at the OS level, which needs no scripting. It batches the
whole navigation so a "table -> PDF manual" run is 2 calls (this + build_manual.py),
not ~40.

PREFER clean scripting when available: run --preflight first. If it reports
sessions>0, capture with take_screenshot.py --method hardcopy instead (cleaner).
This OS-automation path is the fallback for when scripting can't be enabled.

Modes
-----
  --preflight            Print {sap_running, classic_windows, scripting_attachable,
                         sessions, recommendation, guidance} as JSON and exit.
                         Branch on `recommendation`; do NOT probe-loop.
  --list                 List classic SAP GUI session windows (hwnd, title).
  --steps STEPS.json     Run the step sequence (default mode).

Steps file (STEPS.json)
-----------------------
  {
    "title": "How to View Table Contents in SE16 - ZAI_T_AI_CONFIG",
    "author": "NTT DATA",
    "window": "optional title substring to target (else active SAP session)",
    "steps": [
      {"action":"okcode","value":"/nSE16","title":"Open SE16","description":"...","shot":true},
      {"action":"type","value":"ZAI_T_AI_CONFIG","title":"Enter table","description":"...","shot":true},
      {"action":"key","value":"Enter","title":"Selection screen","description":"...","shot":true},
      {"action":"key","value":"F8","title":"Results","description":"...","shot":true}
    ]
  }

Actions
-------
  okcode   focus the OK-code command field (single click), type value, send Enter
  type     type value into the focused field; optional "click":[x,y] (window-rel)
  key      press a named key: Enter, F1..F12, Escape, Tab, F3 (Back), etc.
  click    click at window-relative "value":[x,y]
Each step may carry  "shot":true  -> capture AFTER the action; steps with a shot
+ title become manifest entries. Optional per-step "wait" (seconds) overrides
--settle.

Usage
-----
  py gui_navigate_capture.py --preflight
  py gui_navigate_capture.py --steps steps.json --shot-dir screenshots \\
       --emit-manifest steps.manifest.json
  # then:  py build_manual.py --manifest steps.manifest.json --output guide.pdf
"""
from __future__ import annotations

import argparse
import ctypes
import json
import os
import sys
import time
from ctypes import wintypes

# The console on a Turkish Windows machine is cp1254. Anything printed that is
# not plain ASCII kills the process there -- including text this file never sees
# in its own source, because a Turkish path or object name arrives through a
# variable. The work is finished by then, so the output lands on disk and the
# consultant still reads a traceback and reports the tool as broken.
# See scripts/test_skill_scripts.py for the three times this was found and
# locally fixed before it was made an invariant.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

try:
    ctypes.windll.user32.SetProcessDPIAware()
except Exception:
    pass

import win32gui
import win32con
import win32process
import win32api

user32 = ctypes.WinDLL("user32", use_last_error=True)
INPUT_KEYBOARD = 1
KEYEVENTF_KEYUP = 2
KEYEVENTF_UNICODE = 4
MOUSEEVENTF_LEFTDOWN = 2
MOUSEEVENTF_LEFTUP = 4
SAP_CLASS = "SAP_FRONTEND_SESSION"

VK = {
    "ENTER": 0x0D, "RETURN": 0x0D, "ESCAPE": 0x1B, "ESC": 0x1B, "TAB": 0x09,
    "F1": 0x70, "F2": 0x71, "F3": 0x72, "F4": 0x73, "F5": 0x74, "F6": 0x75,
    "F7": 0x76, "F8": 0x77, "F9": 0x78, "F10": 0x79, "F11": 0x7A, "F12": 0x7B,
}

wintypes.ULONG_PTR = wintypes.WPARAM


class _KBD(ctypes.Structure):
    _fields_ = [("wVk", wintypes.WORD), ("wScan", wintypes.WORD),
                ("dwFlags", wintypes.DWORD), ("time", wintypes.DWORD),
                ("dwExtraInfo", wintypes.ULONG_PTR)]


class _MS(ctypes.Structure):
    _fields_ = [("dx", wintypes.LONG), ("dy", wintypes.LONG),
                ("mouseData", wintypes.DWORD), ("dwFlags", wintypes.DWORD),
                ("time", wintypes.DWORD), ("dwExtraInfo", wintypes.ULONG_PTR)]


class _U(ctypes.Union):
    _fields_ = [("ki", _KBD), ("mi", _MS)]


class _INP(ctypes.Structure):
    _fields_ = [("type", wintypes.DWORD), ("u", _U)]


def _send(*inputs):
    n = len(inputs)
    user32.SendInput(n, (_INP * n)(*inputs), ctypes.sizeof(_INP))


def _uni(ch, up):
    return _INP(type=INPUT_KEYBOARD,
                u=_U(ki=_KBD(0, ord(ch), KEYEVENTF_UNICODE | (KEYEVENTF_KEYUP if up else 0), 0, 0)))


def _vk(code, up):
    return _INP(type=INPUT_KEYBOARD,
                u=_U(ki=_KBD(code, 0, (KEYEVENTF_KEYUP if up else 0), 0, 0)))


def type_text(s):
    for ch in s:
        _send(_uni(ch, False))
        _send(_uni(ch, True))
        time.sleep(0.03)


def press_key(name):
    code = VK.get(name.strip().upper())
    if code is None:
        raise ValueError(f"unknown key '{name}' (use Enter, F1..F12, Escape, Tab)")
    _send(_vk(code, False))
    _send(_vk(code, True))


def click(x, y):
    # SINGLE click — double-click opens the OK-code combo dropdown and eats keys.
    user32.SetCursorPos(int(x), int(y))
    time.sleep(0.15)
    user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
    user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)


# ---------------------------------------------------------------------------
# Window capture (Win32 PrintWindow, ImageGrab fallback) — self-contained.
# ---------------------------------------------------------------------------

def _require_pillow():
    try:
        import PIL  # noqa: F401
    except ImportError:
        sys.exit("ERROR: Pillow required for window capture. Run: py -m pip install Pillow")


def capture_printwindow(hwnd, output_path):
    import win32ui
    from PIL import Image
    left, top, right, bottom = win32gui.GetWindowRect(hwnd)
    width, height = right - left, bottom - top
    if width <= 0 or height <= 0:
        raise RuntimeError("Window has zero size (minimized?).")
    hwnd_dc = win32gui.GetWindowDC(hwnd)
    mfc_dc = win32ui.CreateDCFromHandle(hwnd_dc)
    save_dc = mfc_dc.CreateCompatibleDC()
    bmp = win32ui.CreateBitmap()
    bmp.CreateCompatibleBitmap(mfc_dc, width, height)
    save_dc.SelectObject(bmp)
    ok = ctypes.windll.user32.PrintWindow(hwnd, save_dc.GetSafeHdc(), 2)  # PW_RENDERFULLCONTENT
    info = bmp.GetInfo()
    bits = bmp.GetBitmapBits(True)
    img = Image.frombuffer("RGB", (info["bmWidth"], info["bmHeight"]), bits, "raw", "BGRX", 0, 1)
    win32gui.DeleteObject(bmp.GetHandle())
    save_dc.DeleteDC()
    mfc_dc.DeleteDC()
    win32gui.ReleaseDC(hwnd, hwnd_dc)
    if not ok:
        raise RuntimeError("PrintWindow returned 0 (capture failed).")
    img.save(output_path)


def capture_imagegrab(hwnd, output_path):
    from PIL import ImageGrab
    try:
        win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
        win32gui.SetForegroundWindow(hwnd)
        time.sleep(0.4)
    except Exception:
        pass
    rect = win32gui.GetWindowRect(hwnd)
    ImageGrab.grab(bbox=rect, all_screens=True).save(output_path)


def capture(hwnd, path):
    _require_pillow()
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    try:
        capture_printwindow(hwnd, path)
    except Exception:
        capture_imagegrab(hwnd, path)
    return os.path.getsize(path)


# ---------------------------------------------------------------------------
# Window resolution + foreground
# ---------------------------------------------------------------------------

def sap_session_windows():
    out = []

    def _cb(h, _):
        if win32gui.GetClassName(h) == SAP_CLASS:
            out.append((h, win32gui.GetWindowText(h)))
    win32gui.EnumWindows(_cb, None)
    return out


def resolve_window(title_substr=None):
    """Pick the target SAP GUI session window. Explicit title substring wins;
    else the foreground SAP window; else the first. Returns (hwnd, title)."""
    wins = sap_session_windows()
    if not wins:
        return None, None
    if title_substr:
        for h, c in wins:
            if title_substr.lower() in c.lower():
                return h, c
    fg = user32.GetForegroundWindow()
    for h, c in wins:
        if h == fg:
            return h, c
    return wins[0]


def force_fg(hwnd):
    """Bring hwnd to the foreground past Windows' focus-steal lock
    (AttachThreadInput trick). Returns the resulting foreground hwnd."""
    try:
        win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
    except Exception:
        return 0
    fg = user32.GetForegroundWindow()
    t1 = win32process.GetWindowThreadProcessId(fg)[0] if fg else 0
    t2 = win32process.GetWindowThreadProcessId(hwnd)[0]
    cur = win32api.GetCurrentThreadId()
    for a, b in [(t1, cur), (t2, cur)]:
        if a and a != b:
            user32.AttachThreadInput(a, b, True)
    try:
        win32gui.BringWindowToTop(hwnd)
    except Exception:
        pass
    try:
        win32gui.SetForegroundWindow(hwnd)
    except Exception:
        pass
    time.sleep(0.35)
    got = user32.GetForegroundWindow()
    for a, b in [(t1, cur), (t2, cur)]:
        if a and a != b:
            user32.AttachThreadInput(a, b, False)
    return got


# ---------------------------------------------------------------------------
# Preflight: branch on the recommendation instead of probe-looping.
# ---------------------------------------------------------------------------

ENABLE_SCRIPTING_GUIDE = (
    "SAP GUI Scripting is reachable but no session is attached — scripting is "
    "almost certainly disabled SERVER-SIDE. The clean, reliable path is to "
    "enable it (preferably temporarily), then log off/on:\n"
    "  SERVER (basis, dynamic — no restart): tx RZ11 -> parameter "
    "'sapgui/user_scripting' -> Change Value -> TRUE. Takes effect for NEW "
    "sessions; persist via RZ10 profile if wanted. Requires basis authorization.\n"
    "  CLIENT (each user): SAP Logon -> Options (Alt+F12) -> Accessibility & "
    "Scripting -> Scripting -> tick 'Enable scripting', UNtick the two 'Notify' "
    "boxes.\n"
    "  Then: log off and back on so the session exposes to scripting; re-run "
    "--preflight to confirm sessions>0, and capture with "
    "take_screenshot.py --method hardcopy (clean) instead of OS automation.\n"
    "If enabling scripting is NOT possible (no basis access / policy), the best "
    "fallback is WebGUI (SAP GUI for HTML) driven in a browser via Playwright/"
    "chrome-devtools — same office-manual pipeline, fully reliable."
)
WEBGUI_GUIDE = (
    "No classic SAP GUI session is available. Best option: drive the system's "
    "WebGUI (SAP GUI for HTML, e.g. https://<host>/sap/bc/gui/sap/its/webgui) in "
    "a browser via Playwright/chrome-devtools, capture each screen, and feed the "
    "PNGs to build_manual.py — identical manifest, fully reliable."
)


def recommend(info):
    """Map preflight facts to a primary recommendation + human guidance, in the
    priority order: clean scripting > enable scripting temporarily > WebGUI."""
    if not info["sap_running"]:
        return ("webgui_playwright",
                "SAP GUI is not running. Either open SAP GUI + log in for the "
                "classic path, or use WebGUI + Playwright.\n" + WEBGUI_GUIDE)
    if info.get("scripting_attachable") and info["sessions"] >= info["classic_windows"] > 0:
        return ("scripting",
                "Scripting is fully usable. Capture cleanly with "
                "take_screenshot.py --method hardcopy (no OS automation needed).")
    return ("enable_scripting", ENABLE_SCRIPTING_GUIDE)


def preflight():
    wins = sap_session_windows()
    info = {"sap_running": bool(wins), "classic_windows": len(wins),
            "scripting_attachable": False, "sessions": 0}
    try:
        import win32com.client
        eng = win32com.client.GetObject("SAPGUI").GetScriptingEngine
        info["scripting_attachable"] = eng is not None
        info["sessions"] = sum(eng.Children(i).Children.Count
                               for i in range(eng.Children.Count))
    except Exception as exc:
        info["scripting_error"] = str(exc)[:120]
    rec, guidance = recommend(info)
    info["recommendation"] = rec
    info["guidance"] = guidance
    return info


# ---------------------------------------------------------------------------
# Main run
# ---------------------------------------------------------------------------

def run_steps(spec, shot_dir, okcode_xy, settle):
    hwnd, title = resolve_window(spec.get("window"))
    if hwnd is None:
        sys.exit("ERROR: no classic SAP GUI session window found. "
                 "Open SAP GUI and log in first (see --preflight).")
    print(f"[gui] driving hwnd={hwnd} {title!r}")
    ox, oy = okcode_xy
    manifest_steps = []
    step_no = 0

    for i, st in enumerate(spec.get("steps", []), start=1):
        action = st.get("action", "")
        value = st.get("value", "")
        wait = float(st.get("wait", settle))

        got = force_fg(hwnd)
        if got != hwnd:  # handle may be stale (session re-rendered) — re-resolve once
            hwnd, title = resolve_window(spec.get("window"))
            if hwnd is None:
                sys.exit("ERROR: SAP GUI window vanished mid-run.")
            force_fg(hwnd)
        r = win32gui.GetWindowRect(hwnd)

        if action == "okcode":
            click(r[0] + ox, r[1] + oy)       # focus OK-code field (single click)
            time.sleep(0.3)
            type_text(value)
            time.sleep(0.15)
            press_key("Enter")
        elif action == "type":
            if st.get("click"):
                cx, cy = st["click"]
                click(r[0] + int(cx), r[1] + int(cy))
                time.sleep(0.3)
            type_text(value)
        elif action == "key":
            press_key(value)
        elif action == "click":
            cx, cy = value
            click(r[0] + int(cx), r[1] + int(cy))
        else:
            print(f"[gui] step {i}: unknown action {action!r} — skipped")
            continue

        time.sleep(wait)

        if st.get("shot"):
            step_no += 1
            path = os.path.join(shot_dir, f"step_{step_no:03d}.png")
            size = capture(hwnd, path)
            cur_title = win32gui.GetWindowText(hwnd)
            print(f"[gui] step {i} ({action} {value!r}) -> {path} {size:,}b  [{cur_title!r}]")
            manifest_steps.append({
                "step": step_no,
                "title": st.get("title", f"Step {step_no}"),
                "description": st.get("description", ""),
                "screenshot": os.path.abspath(path),
            })
        else:
            print(f"[gui] step {i} ({action} {value!r}) [no shot]")

    return {
        "title": spec.get("title", "SAP GUI Guide"),
        "author": spec.get("author", ""),
        "steps": manifest_steps,
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description="Drive classic SAP GUI and capture a step sequence in one run.")
    ap.add_argument("--steps", help="steps JSON file")
    ap.add_argument("--shot-dir", default="screenshots", help="directory for step_NNN.png")
    ap.add_argument("--emit-manifest", help="write a build_manual.py-ready manifest here")
    ap.add_argument("--preflight", action="store_true", help="print capability JSON and exit")
    ap.add_argument("--list", action="store_true", help="list SAP GUI session windows and exit")
    ap.add_argument("--okcode-xy", default="110,51",
                    help="window-relative x,y of the OK-code command field (default 110,51)")
    ap.add_argument("--settle", type=float, default=2.2,
                    help="seconds to wait after each action (default 2.2)")
    args = ap.parse_args(argv)

    if args.preflight:
        print(json.dumps(preflight(), indent=2))
        return 0
    if args.list:
        for h, c in sap_session_windows():
            print(h, repr(c))
        return 0
    if not args.steps:
        sys.exit("ERROR: --steps required (or use --preflight / --list)")

    spec = json.loads(open(args.steps, encoding="utf-8").read())
    ox, oy = (int(v) for v in args.okcode_xy.split(","))
    manifest = run_steps(spec, args.shot_dir, (ox, oy), args.settle)

    if args.emit_manifest:
        with open(args.emit_manifest, "w", encoding="utf-8") as fh:
            json.dump(manifest, fh, indent=2, ensure_ascii=False)
        print(f"[gui] manifest -> {args.emit_manifest} ({len(manifest['steps'])} steps)")
        print(f"[gui] next: build_manual.py --manifest {args.emit_manifest} --output guide.pdf")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
