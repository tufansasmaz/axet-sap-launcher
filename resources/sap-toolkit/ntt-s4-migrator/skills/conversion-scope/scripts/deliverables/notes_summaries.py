"""notes-summaries/ writer.

Produces one markdown file per SAP Note in ``output/notes-summaries/<note-number>.md``.
Each file is prefixed with a YAML-style metadata header containing note_number and
source_format, followed by the LLM summary (or the raw text if no summary was
generated).
"""

from pathlib import Path

from scripts.schemas import NoteText

_NO_SUMMARY_PLACEHOLDER = "*No LLM summary available for this note.*"


def write_notes_summaries(
    notes: list[NoteText],
    summaries: dict[int, str],
    out_dir: Path,
) -> None:
    """Write per-note markdown files into ``out_dir``.

    Parameters
    ----------
    notes:
        NoteText objects (one per SAP Note).
    summaries:
        Mapping of note_number → summary text produced by the LLM.
        Notes absent from this dict still get a file (with a placeholder).
    out_dir:
        Output directory; created automatically if it does not exist.
        Each file is named ``<note_number>.md``.
    """
    out_dir.mkdir(parents=True, exist_ok=True)

    for note in notes:
        summary = summaries.get(note.note_number, _NO_SUMMARY_PLACEHOLDER)
        content = _render(note, summary)
        (out_dir / f"{note.note_number}.md").write_text(content, encoding="utf-8")


def _render(note: NoteText, summary: str) -> str:
    """Render a single note markdown file."""
    return "\n".join([
        "---",
        f"note_number: {note.note_number}",
        f"source_format: {note.source_format}",
        "---",
        "",
        f"# SAP Note {note.note_number}",
        "",
        "## Summary",
        "",
        summary,
        "",
    ])
