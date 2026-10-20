#!/usr/bin/env python3
"""Finish a screen mock-up: inline the house style, then photograph every state.

  py mockup.py <ekran-maketi-konu.src.html> [--out-dir DIR] [--no-shots]

1. The page written from assets/skeleton.html carries two markers,
   `<!-- @sapgui:css -->` and `<!-- @sapgui:js -->`. They are replaced by
   assets/sapgui.css and assets/sapgui.js, so every mock-up looks and behaves
   alike and the result is ONE self-contained .html (it travels by e-mail and
   into SharePoint; no CDN, no second file). `<name>.src.html` becomes
   `<name>.html`.
2. Each screen and popup (`data-state`) is opened the way a user reaches it
   (`MOCKUP_PREPARE`) and saved as `<name>-<state>.png` -- the whole screen, the
   grid with every column. Those pictures go into the FS, section 7: a Word or
   PDF FS cannot hold a clickable page, and before 2026-09-28 the FS only named
   the .html, so the reader of the FS never saw the screen at all.

Screenshots need Playwright's Chromium, the same one office-pdf uses:
    py -m pip install playwright  &&  py -m playwright install chromium
Without it the .html is still written; the PNGs are skipped with that hint.
Exit codes: 0 ok, 2 usage, 4 page has no data-state screens.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ASSETS = Path(__file__).resolve().parent.parent / "assets"


def die(msg: str, code: int = 2) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(code)


def inline(src: str) -> str:
    css = (ASSETS / "sapgui.css").read_text(encoding="utf-8")
    js = (ASSETS / "sapgui.js").read_text(encoding="utf-8")
    out = src.replace("<!-- @sapgui:css -->", f"<style>\n{css}</style>")
    out = out.replace("<!-- @sapgui:js -->", f"<script>\n{js}</script>")
    return out


def slug(text: str) -> str:
    t = text.lower()
    for a, b in (("ı", "i"), ("ğ", "g"), ("ü", "u"), ("ş", "s"), ("ö", "o"), ("ç", "c")):
        t = t.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")[:40]


def shots(html: Path) -> list[tuple[str, str, Path]]:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("NOTE: screenshots skipped -- Playwright is not installed:\n"
              "    py -m pip install playwright  &&  py -m playwright install chromium")
        return []
    made = []
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch()
        except Exception as exc:                          # browser not downloaded
            print(f"NOTE: screenshots skipped -- Chromium is not available ({exc.__class__.__name__}):\n"
                  "    py -m playwright install chromium")
            return []
        page = browser.new_page(viewport={"width": 1400, "height": 900}, device_scale_factor=2)
        page.goto(html.resolve().as_uri())
        page.wait_for_timeout(300)
        states = page.evaluate("window.MOCKUP ? MOCKUP.states() : []")
        if not states:
            browser.close()
            die(f"{html.name} has no data-state screens (was it written from assets/skeleton.html?)", 4)
        page.evaluate("document.body.classList.add('shot')")
        for st in states:
            page.evaluate("id => MOCKUP.go(id)", st["id"])
            page.wait_for_timeout(250)
            target = html.with_name(f"{html.stem}-{st['id']}-{slug(st['label'])}.png")
            if st["pop"]:
                box = page.evaluate("""id => { const el = document.querySelector(`[data-state="${id}"]`);
                    const r = el.getBoundingClientRect(); return {x:r.x, y:r.y, w:r.width, h:r.height}; }""",
                                    st["id"])
                pad = 24
                page.screenshot(path=str(target), full_page=True,
                                clip={"x": max(0, box["x"] - pad), "y": max(0, box["y"] - pad),
                                      "width": box["w"] + 2 * pad, "height": box["h"] + 2 * pad})
            else:
                page.locator(f'.win[data-state="{st["id"]}"]').screenshot(path=str(target))
            made.append((st["id"], st["label"], target))
        browser.close()
    return made


def main() -> int:
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(errors="replace") if s.isatty() else s.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError, OSError):
            pass
    ap = argparse.ArgumentParser(description="Inline the house style and photograph each state.")
    ap.add_argument("src", type=Path)
    ap.add_argument("--out-dir", type=Path)
    ap.add_argument("--no-shots", action="store_true")
    ap.add_argument("--fs-dir", type=Path,
                    help="folder of the FS Markdown: image lines are printed relative to it")
    a = ap.parse_args()
    if not a.src.is_file():
        die(f"{a.src} does not exist")
    name = a.src.name.replace(".src.html", ".html")
    out_dir = a.out_dir or a.src.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    html = out_dir / name
    text = a.src.read_text(encoding="utf-8")
    if "<!-- @sapgui:css -->" not in text and "--hdr:#dfe8f3" not in text:
        die(f"{a.src.name} has no <!-- @sapgui:css --> marker; start from assets/skeleton.html")
    html.write_text(inline(text), encoding="utf-8")
    print(f"mock-up: {html}")
    if a.no_shots:
        return 0
    made = shots(html)
    for sid, label, png in made:
        print(f"  {sid:<4} {png.name}")
    if made:
        import os
        from urllib.parse import quote
        base = (a.fs_dir or png.parent).resolve()
        print("FS section 7 -- paste these lines (paths relative to the FS Markdown):")
        for sid, label, png in made:
            rel = Path(os.path.relpath(png.resolve(), base)).as_posix()
            print(f"  ![Ekran {sid} — {label}]({quote(rel)})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
