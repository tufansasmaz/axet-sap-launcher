#!/usr/bin/env python3
"""
render_pdf.py — Render a single Functional Specification markdown file to a branded PDF
via the office-pdf skill.

Usage:
    python render_pdf.py <fs_markdown_file> [output_pdf] [title]

Arguments:
    fs_markdown_file  The FS markdown to render.
    output_pdf        Optional: output PDF path (defaults to the .md path with .pdf suffix).
    title             Optional: PDF title (defaults to the markdown file stem).

Examples:
    python render_pdf.py ./fs-output/PP007-FS.md
    python render_pdf.py ./fs-output/PP007-FS.md ./fs-output/PP007-FS.pdf "PP007 - Fonksiyonel Spesifikasyon"

It resolves office-pdf's md_to_pdf.py automatically for this repo's layout:
  - real repo clone:  <repo>/office-tools/skills/office-pdf/scripts/md_to_pdf.py
  - installed sibling: .axet-code/skills/office-pdf/scripts/md_to_pdf.py
Override with the OFFICE_PDF_SCRIPT environment variable.
"""

import os
import sys
import subprocess

_HERE = os.path.dirname(os.path.abspath(__file__))


def _office_pdf_candidates():
    """Candidate locations for office-pdf's md_to_pdf.py, most-specific first."""
    rel = os.path.join("office-pdf", "scripts", "md_to_pdf.py")
    cands = [
        # This repo clone: abaper/skills/fs-generator/scripts -> repo root -> office-tools/...
        os.path.normpath(os.path.join(
            _HERE, "..", "..", "..", "..",
            "office-tools", "skills", "office-pdf", "scripts", "md_to_pdf.py")),
        # Installed as sibling skill: .axet-code/skills/fs-generator/scripts -> .axet-code/skills/office-pdf
        os.path.normpath(os.path.join(_HERE, "..", "..", rel)),
        # Legacy NTT marketplace layouts (backward compatibility)
        r"C:\workspace\ntt-claude-marketplace\plugins\office-tools\skills\office-pdf\scripts\md_to_pdf.py",
        os.path.expanduser("~/axet-marketplaces/ntt/plugins/office-tools/skills/office-pdf/scripts/md_to_pdf.py"),
        os.path.expanduser("~/.axet-marketplaces/ntt/plugins/office-tools/skills/office-pdf/scripts/md_to_pdf.py"),
    ]
    env = os.environ.get("OFFICE_PDF_SCRIPT")
    if env:
        cands.insert(0, env)
    return cands


def find_office_pdf_script():
    """Find the office-pdf script in known locations."""
    for path in _office_pdf_candidates():
        if os.path.exists(path):
            return path
    return None


def create_pdf(md_path, pdf_path, title):
    """Convert the markdown to PDF using office-pdf."""
    script = find_office_pdf_script()

    if not script:
        print("[pdf] ERROR: office-pdf script (md_to_pdf.py) not found in any known location")
        print("[pdf] Tried:")
        for p in _office_pdf_candidates():
            print(f"  - {p}")
        print("[pdf] Install the office-pdf skill in this project, or set OFFICE_PDF_SCRIPT.")
        return False

    print(f"[pdf] Using: {script}")
    print(f"[pdf] Converting to PDF...")

    cmd = [
        sys.executable,
        script,
        "--input", md_path,
        "--output", pdf_path,
        "--title", title,
        "--force",
    ]

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    if result.returncode != 0:
        print(f"[pdf] ERROR: {result.stderr}")
        return False

    if result.stdout:
        print(result.stdout.strip())

    if os.path.exists(pdf_path):
        size_kb = os.path.getsize(pdf_path) / 1024
        print(f"[pdf] SUCCESS: {pdf_path} ({size_kb:.1f} KB)")
        return True
    else:
        print("[pdf] ERROR: PDF file was not created")
        return False


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    md_path = sys.argv[1]

    if not os.path.isfile(md_path):
        print(f"[error] File not found: {md_path}")
        sys.exit(1)

    if len(sys.argv) >= 3:
        pdf_path = sys.argv[2]
    else:
        base, _ = os.path.splitext(md_path)
        pdf_path = base + ".pdf"

    if len(sys.argv) >= 4:
        title = sys.argv[3]
    else:
        title = os.path.splitext(os.path.basename(md_path))[0]

    print("=" * 60)
    print("FS-GENERATOR — PDF Renderer")
    print(f"Input:  {md_path}")
    print(f"Output: {pdf_path}")
    print("=" * 60)

    success = create_pdf(md_path, pdf_path, title)

    print()
    print("=" * 60)
    if success:
        print(f"DONE! PDF: {pdf_path}")
    else:
        print("FAILED: PDF was not created")
    print("=" * 60)

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
