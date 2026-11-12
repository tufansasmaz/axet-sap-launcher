#!/usr/bin/env python3
"""Finish a Fiori mock-up: inline the house style, then photograph every state.

  py mockup.py <fiori-maketi-konu.src.html> [--out-dir DIR] [--no-shots] [--fs-dir DIR]

1. The page written from assets/skeleton.html carries two markers, `<!-- @fiori:css -->` and
   `<!-- @fiori:js -->`. They are replaced by assets/fiori.css and assets/fiori.js, so every mock-up looks
   and behaves alike and the result is ONE self-contained .html (it travels by e-mail and into SharePoint;
   no CDN, no UI5, no second file). `<name>.src.html` becomes `<name>.html`.
2. Each screen and dialog (`data-state`) is opened the way a user reaches it (`MOCKUP_PREPARE`) and saved
   three times: `<name>-<state>-<label>-desktop.png`, `-phone.png` (the same markup narrowed to a phone: the
   responsive behaviour is what a Fiori review is about) and `-annot.png` (desktop with the annotation
   overlay: which `@UI` annotation drives which part). The desktop picture goes into the FS section 7,
   the other two beside it.

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
VIEWS = (("desktop", 1400, False), ("phone", 400, False), ("annot", 1400, True))


def die(msg: str, code: int = 2) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(code)


def inline(src: str) -> str:
    css = (ASSETS / "fiori.css").read_text(encoding="utf-8")
    js = (ASSETS / "fiori.js").read_text(encoding="utf-8")
    out = src.replace("<!-- @fiori:css -->", f"<style>\n{css}</style>")
    out = out.replace("<!-- @fiori:js -->", f"<script>\n{js}</script>")
    return out


def slug(text: str) -> str:
    t = text.lower()
    for a, b in (("ı", "i"), ("ğ", "g"), ("ü", "u"), ("ş", "s"), ("ö", "o"), ("ç", "c")):
        t = t.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")[:40]


def shots(html: Path) -> list[tuple[str, str, str, Path]]:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("NOTE: screenshots skipped -- Playwright is not installed:\n"
              "    py -m pip install playwright  &&  py -m playwright install chromium")
        return []
    made = []
    with sync_playwright() as p:
        browser, last = None, None
        # Playwright's own Chromium first; then the Chrome or Edge already on the machine (every NTT
        # laptop has one), so a consultant does not have to download a second browser for the pictures.
        for channel in (None, "chrome", "msedge"):
            try:
                browser = p.chromium.launch(channel=channel) if channel else p.chromium.launch()
                break
            except Exception as exc:
                last = exc
        if browser is None:
            print(f"NOTE: screenshots skipped -- no browser could be started ({last.__class__.__name__}):\n"
                  "    py -m playwright install chromium")
            return []
        for view, width, ann in VIEWS:
            page = browser.new_page(viewport={"width": width, "height": 900}, device_scale_factor=2)
            page.goto(html.resolve().as_uri())
            page.wait_for_timeout(300)
            states = page.evaluate("window.MOCKUP ? MOCKUP.states() : []")
            if not states:
                browser.close()
                die(f"{html.name} has no data-state screens (was it written from assets/skeleton.html?)", 4)
            page.evaluate("document.body.classList.add('shot')")
            page.evaluate(f"MOCKUP.setView('{'phone' if view == 'phone' else 'desktop'}')")
            page.evaluate(f"MOCKUP.setAnn({str(ann).lower()})")
            for st in states:
                page.evaluate("id => MOCKUP.go(id)", st["id"])
                page.wait_for_timeout(250)
                target = html.with_name(f"{html.stem}-{st['id']}-{slug(st['label'])}-{view}.png")
                if st["pop"]:
                    box = page.evaluate("""id => { const el = document.querySelector(`[data-state="${id}"]`);
                        const r = el.getBoundingClientRect(); return {x:r.x, y:r.y, w:r.width, h:r.height}; }""",
                                        st["id"])
                    pad = 24
                    page.screenshot(path=str(target), full_page=True,
                                    clip={"x": max(0, box["x"] - pad), "y": max(0, box["y"] - pad),
                                          "width": box["w"] + 2 * pad, "height": box["h"] + 2 * pad})
                else:
                    page.locator(f'.app[data-state="{st["id"]}"]').screenshot(path=str(target))
                made.append((st["id"], st["label"], view, target))
            page.close()
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
    if "<!-- @fiori:css -->" not in text:
        die(f"{a.src.name} has no <!-- @fiori:css --> marker; start from assets/skeleton.html")
    html.write_text(inline(text), encoding="utf-8")
    print(f"mock-up: {html}")
    if a.no_shots:
        return 0
    made = shots(html)
    for sid, label, view, png in made:
        print(f"  {sid:<4} {view:<8} {png.name}")
    if made:
        import os
        from urllib.parse import quote
        base = (a.fs_dir or made[0][3].parent).resolve()
        print("FS section 7 -- paste these lines (paths relative to the FS Markdown); the desktop picture "
              "first, the phone and annotated ones beside it:")
        for sid, label, view, png in made:
            rel = Path(os.path.relpath(png.resolve(), base)).as_posix()
            word = {"desktop": "Desktop", "phone": "Phone", "annot": "Annotations"}[view]
            print(f"  ![Screen {sid} — {label} ({word})]({quote(rel)})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
