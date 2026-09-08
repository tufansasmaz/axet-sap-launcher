"""SAP Notes (PDF + HTML) → list[NoteText].

Filenames must be a SAP Note number (integer) + extension (.pdf, .html, .htm).
Files that don't match this pattern are silently skipped.
"""

from pathlib import Path

import pdfplumber
from bs4 import BeautifulSoup

from scripts.schemas import NoteText


class NotesIngester:
    def load_dir(self, dir_path: Path) -> list[NoteText]:
        if not dir_path.is_dir():
            return []
        notes: list[NoteText] = []
        for file in sorted(dir_path.iterdir()):
            try:
                num = int(file.stem)
            except ValueError:
                continue  # filename isn't a note number — skip
            if num <= 0:
                continue
            if file.suffix == ".pdf":
                notes.append(self._parse_pdf(file, num))
            elif file.suffix in (".html", ".htm"):
                notes.append(self._parse_html(file, num))
        return notes

    @staticmethod
    def _parse_pdf(path: Path, num: int) -> NoteText:
        with pdfplumber.open(path) as pdf:
            text = "\n".join((page.extract_text() or "") for page in pdf.pages)
        return NoteText(note_number=num, text=text.strip(), source_format="pdf")

    @staticmethod
    def _parse_html(path: Path, num: int) -> NoteText:
        soup = BeautifulSoup(path.read_bytes(), "html.parser")
        return NoteText(
            note_number=num,
            text=soup.get_text(separator=" ", strip=True),
            source_format="html",
        )
