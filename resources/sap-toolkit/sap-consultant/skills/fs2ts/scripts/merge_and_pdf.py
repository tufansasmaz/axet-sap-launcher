#!/usr/bin/env python3
"""
merge_and_pdf.py — Merge TS markdown parts and create a branded PDF via office-pdf.

Usage:
    python merge_and_pdf.py <output_dir> [wricef_id] [title]

Arguments:
    output_dir  Directory containing the TS part files
    wricef_id   Optional: WRICEF ID (auto-detected from filenames if not provided)
    title       Optional: PDF title (auto-generated if not provided)

Examples:
    python merge_and_pdf.py ./ts-output
    python merge_and_pdf.py ./ts-output PP007
    python merge_and_pdf.py ./ts-output PP007 "PP007 - MRP Teknik Spesifikasyon"

This script renders the PDF by shelling out to the office-pdf skill's md_to_pdf.py.
It resolves that script from this repo's layout automatically:
  - real repo clone:  <repo>/office-tools/skills/office-pdf/scripts/md_to_pdf.py
  - installed sibling: .axet-code/skills/office-pdf/scripts/md_to_pdf.py
"""

import os
import sys
import subprocess
import glob
import re

_HERE = os.path.dirname(os.path.abspath(__file__))


def _office_pdf_candidates():
    """Candidate locations for office-pdf's md_to_pdf.py, most-specific first."""
    rel = os.path.join("office-pdf", "scripts", "md_to_pdf.py")
    cands = [
        # This repo clone: abaper/skills/fs2ts/scripts -> repo root -> office-tools/skills/office-pdf
        os.path.normpath(os.path.join(
            _HERE, "..", "..", "..", "..",
            "office-tools", "skills", "office-pdf", "scripts", "md_to_pdf.py")),
        # Installed as sibling skill: .axet-code/skills/fs2ts/scripts -> .axet-code/skills/office-pdf
        os.path.normpath(os.path.join(_HERE, "..", "..", rel)),
        # Legacy NTT marketplace layouts (backward compatibility)
        r"C:\workspace\ntt-claude-marketplace\plugins\office-tools\skills\office-pdf\scripts\md_to_pdf.py",
        os.path.expanduser("~/axet-marketplaces/ntt/plugins/office-tools/skills/office-pdf/scripts/md_to_pdf.py"),
        os.path.expanduser("~/.axet-marketplaces/ntt/plugins/office-tools/skills/office-pdf/scripts/md_to_pdf.py"),
    ]
    # Allow an explicit override.
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


def detect_wricef_id(output_dir):
    """Auto-detect WRICEF ID from filenames in the directory."""
    pattern = os.path.join(output_dir, "*-TS-Part*.md")
    files = glob.glob(pattern)

    if not files:
        return None

    # Extract WRICEF ID from first matching file
    filename = os.path.basename(sorted(files)[0])
    match = re.match(r'^(.+?)-TS-Part', filename)
    if match:
        return match.group(1)

    return None


def get_part_files(output_dir, wricef_id):
    """Get list of TS part files in correct order."""
    parts = []

    for i in range(1, 10):  # Support up to 9 parts
        pattern = os.path.join(output_dir, f"{wricef_id}-TS-Part{i}*.md")
        matches = glob.glob(pattern)
        if matches:
            parts.extend(sorted(matches))

    return parts


def merge_markdown_files(output_dir, wricef_id):
    """Merge all markdown part files into one."""
    part_files = get_part_files(output_dir, wricef_id)

    if not part_files:
        print(f"[merge] ERROR: No part files found for {wricef_id} in {output_dir}")
        return None

    print(f"[merge] Found {len(part_files)} part files")

    merged_content = []
    total_lines = 0

    for filepath in part_files:
        filename = os.path.basename(filepath)
        print(f"[merge] Reading: {filename}")

        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
            lines = content.count('\n') + 1
            total_lines += lines
            merged_content.append(content)
            merged_content.append("\n\n")

    output_md = os.path.join(output_dir, f"{wricef_id}-Teknik-Spesifikasyon.md")

    with open(output_md, "w", encoding="utf-8") as f:
        f.write("".join(merged_content))

    print(f"[merge] Written: {output_md}")
    print(f"[merge] Total lines: {total_lines}")

    return output_md


def create_pdf(md_path, pdf_path, title):
    """Convert merged markdown to PDF using office-pdf."""
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
    # Parse arguments
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    output_dir = sys.argv[1]

    if not os.path.isdir(output_dir):
        print(f"[error] Directory not found: {output_dir}")
        sys.exit(1)

    # Get or detect WRICEF ID
    if len(sys.argv) >= 3:
        wricef_id = sys.argv[2]
    else:
        wricef_id = detect_wricef_id(output_dir)
        if not wricef_id:
            print("[error] Could not detect WRICEF ID. Please provide it as argument.")
            sys.exit(1)
        print(f"[info] Auto-detected WRICEF ID: {wricef_id}")

    # Get or generate title
    if len(sys.argv) >= 4:
        title = sys.argv[3]
    else:
        title = f"{wricef_id} - Teknik Spesifikasyon"

    # Output paths
    output_md = os.path.join(output_dir, f"{wricef_id}-Teknik-Spesifikasyon.md")
    output_pdf = os.path.join(output_dir, f"{wricef_id}-Teknik-Spesifikasyon.pdf")

    print("=" * 60)
    print("FS2TS — Merge & PDF Generator")
    print(f"WRICEF ID: {wricef_id}")
    print(f"Output Dir: {output_dir}")
    print("=" * 60)

    # Step 1: Merge markdown files
    md_path = merge_markdown_files(output_dir, wricef_id)
    if not md_path:
        sys.exit(1)

    # Step 2: Create PDF
    print()
    success = create_pdf(md_path, output_pdf, title)

    # Summary
    print()
    print("=" * 60)
    if success:
        print("DONE! Files created:")
        print(f"  Markdown: {output_md}")
        print(f"  PDF:      {output_pdf}")
    else:
        print("PARTIAL: Markdown created, PDF failed")
        print(f"  Markdown: {output_md}")
    print("=" * 60)

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
