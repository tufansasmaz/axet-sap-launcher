"""Take a screenshot of a SAP GUI window.

Two capture methods are supported:

  hardcopy  SAP GUI's built-in HardCopy method (via the scripting engine).
            Cleanest result, but needs a classic DIAG session attached to the
            scripting engine (a :32NN dispatcher connection).

  window    OS-level window grab via Win32 PrintWindow (with a PIL.ImageGrab
            fallback). Captures the SAP GUI top-level window bitmap directly —
            works even when HardCopy is unavailable, and doesn't require the
            scripting engine to expose the window.

  auto      (default) Try hardcopy first; if it fails, fall back to window.

Usage:
    python take_screenshot.py --output screenshot.png
    python take_screenshot.py --output shot.png --method window
    python take_screenshot.py --output shot.png --method window --window-title "SAP Easy Access"
    python take_screenshot.py --conn 0 --sess 0 --output "C:\\temp\\sap_screen.png"

Notes:
  - The `window` method needs `pywin32` (already required by this plugin) and
    `Pillow`. If Pillow is missing the script prints the pip command and exits.
  - For a browser-based WebGUI/Fiori system (no classic GUI window), use a
    browser screenshot instead — this script targets classic SAP GUI windows.
"""

import argparse
import sys
import os

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

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sap_gui_lib import (
    attach_scripting_engine, get_session, find_element, get_session_info,
)


# ---------------------------------------------------------------------------
# Method 1: SAP GUI HardCopy (scripting engine)
# ---------------------------------------------------------------------------

def capture_hardcopy(conn, sess, window, output_path):
    """Capture via SAP GUI's HardCopy. Returns session info dict on success."""
    app = attach_scripting_engine()
    session = get_session(app, conn, sess)
    info = get_session_info(session)

    wnd = find_element(session, f"wnd[{window}]")
    if wnd is None:
        raise RuntimeError(f"Window wnd[{window}] not found.")

    wnd.HardCopy(output_path, "PNG")
    if not os.path.exists(output_path):
        raise RuntimeError(
            "HardCopy executed but no file was produced "
            f"at {output_path} (SAP GUI may have saved elsewhere)."
        )
    return info


def session_window_title(conn, sess, window):
    """Best-effort: read the SAP GUI window title text from the session.

    Used to locate the top-level OS window for the `window` method. Returns
    None if the scripting engine isn't reachable.
    """
    try:
        app = attach_scripting_engine()
        session = get_session(app, conn, sess)
        wnd = find_element(session, f"wnd[{window}]")
        return wnd.Text if wnd is not None else None
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Method 2: OS-level window grab (Win32 PrintWindow, then ImageGrab fallback)
# ---------------------------------------------------------------------------

def _require_pillow():
    try:
        import PIL  # noqa: F401
    except ImportError:
        sys.exit("ERROR: Pillow required for --method window. "
                 "Run: py -m pip install Pillow")


def find_sap_window(title=None):
    """Find a SAP GUI top-level window handle.

    If `title` is given, match windows whose caption contains it (case-
    insensitive). Otherwise match by the SAP GUI frame window class
    ('SAP_FRONTEND_SESSION'). Returns (hwnd, caption) or (None, None).
    """
    import win32gui

    matches = []

    def _cb(hwnd, _):
        if not win32gui.IsWindowVisible(hwnd):
            return
        caption = win32gui.GetWindowText(hwnd)
        cls = win32gui.GetClassName(hwnd)
        if title:
            if title.strip() and title.lower() in caption.lower():
                matches.append((hwnd, caption))
        elif "SAP_FRONTEND_SESSION" in cls:
            matches.append((hwnd, caption))
        return

    win32gui.EnumWindows(_cb, None)
    if not matches:
        return None, None
    # Prefer the longest caption (most specific) match.
    matches.sort(key=lambda m: len(m[1]), reverse=True)
    return matches[0]


def _capture_printwindow(hwnd, output_path):
    """Capture a window bitmap via Win32 PrintWindow. Raises on failure."""
    import win32gui
    import win32ui
    from ctypes import windll
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

    # PW_RENDERFULLCONTENT = 2 — renders modern/DirectX content too.
    ok = windll.user32.PrintWindow(hwnd, save_dc.GetSafeHdc(), 2)

    info = bmp.GetInfo()
    bits = bmp.GetBitmapBits(True)
    img = Image.frombuffer(
        "RGB", (info["bmWidth"], info["bmHeight"]), bits, "raw", "BGRX", 0, 1)

    win32gui.DeleteObject(bmp.GetHandle())
    save_dc.DeleteDC()
    mfc_dc.DeleteDC()
    win32gui.ReleaseDC(hwnd, hwnd_dc)

    if not ok:
        raise RuntimeError("PrintWindow returned 0 (capture failed).")
    img.save(output_path)


def _capture_imagegrab(hwnd, output_path):
    """Fallback: bring the window forward and grab its screen rectangle."""
    import time
    import win32gui
    import win32con
    from PIL import ImageGrab

    try:
        win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
        win32gui.SetForegroundWindow(hwnd)
        time.sleep(0.4)
    except Exception:
        pass  # foreground may be refused; grab whatever is at the rect

    rect = win32gui.GetWindowRect(hwnd)
    img = ImageGrab.grab(bbox=rect, all_screens=True)
    img.save(output_path)


def capture_window(output_path, title=None):
    """Capture the SAP GUI window via PrintWindow, falling back to ImageGrab."""
    _require_pillow()
    try:
        import win32gui  # noqa: F401
    except ImportError:
        sys.exit("ERROR: pywin32 required for --method window. "
                 "Run: py -m pip install pywin32")

    hwnd, caption = find_sap_window(title)
    if hwnd is None:
        raise RuntimeError(
            "No SAP GUI window found"
            + (f" matching title '{title}'." if title else
               " (class 'SAP_FRONTEND_SESSION'). Is a classic SAP GUI "
               "session open? For WebGUI/Fiori use a browser screenshot."))

    try:
        _capture_printwindow(hwnd, output_path)
        method = "PrintWindow"
    except Exception as exc:
        # Fall back to a plain screen-rectangle grab.
        _capture_imagegrab(hwnd, output_path)
        method = f"ImageGrab (PrintWindow failed: {exc})"

    if not os.path.exists(output_path):
        raise RuntimeError(f"Window capture produced no file at {output_path}.")
    return caption, method


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Take a screenshot of a SAP GUI window.")
    parser.add_argument("--conn", type=int, default=0, help="Connection index")
    parser.add_argument("--sess", type=int, default=0, help="Session index")
    parser.add_argument("--output", required=True, help="Output file path (PNG)")
    parser.add_argument("--window", type=int, default=0, help="Window index (hardcopy)")
    parser.add_argument("--method", choices=["auto", "hardcopy", "window"],
                        default="auto",
                        help="Capture method (default: auto = hardcopy then window)")
    parser.add_argument("--window-title", default="",
                        help="Window-title substring to locate (window method). "
                             "If omitted, derived from the session or the SAP "
                             "GUI frame class.")
    args = parser.parse_args()

    output_path = os.path.abspath(args.output)
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    # Resolve the window title for the `window` method up-front (best effort).
    title = args.window_title or None

    try:
        if args.method == "hardcopy":
            info = capture_hardcopy(args.conn, args.sess, args.window, output_path)
            size = os.path.getsize(output_path)
            print(f"OK: Screenshot saved to {output_path} ({size:,} bytes) [HardCopy]")
            print(f"    Transaction: {info['transaction']}  Screen: {info['screen_number']}")

        elif args.method == "window":
            if title is None:
                title = session_window_title(args.conn, args.sess, args.window)
            caption, how = capture_window(output_path, title)
            size = os.path.getsize(output_path)
            print(f"OK: Screenshot saved to {output_path} ({size:,} bytes) [{how}]")
            print(f"    Window: {caption!r}")

        else:  # auto
            try:
                info = capture_hardcopy(args.conn, args.sess, args.window, output_path)
                size = os.path.getsize(output_path)
                print(f"OK: Screenshot saved to {output_path} ({size:,} bytes) [HardCopy]")
                print(f"    Transaction: {info['transaction']}  Screen: {info['screen_number']}")
            except Exception as hc_exc:
                print(f"INFO: HardCopy unavailable ({hc_exc}); trying window grab...")
                if title is None:
                    title = session_window_title(args.conn, args.sess, args.window)
                caption, how = capture_window(output_path, title)
                size = os.path.getsize(output_path)
                print(f"OK: Screenshot saved to {output_path} ({size:,} bytes) [{how}]")
                print(f"    Window: {caption!r}")

    except Exception as exc:
        print(f"FAIL: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
