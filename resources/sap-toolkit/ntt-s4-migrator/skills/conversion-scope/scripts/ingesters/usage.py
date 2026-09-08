"""SUSG / CCM Fiori app export → list[UsageRow].

Primary path: CCM Fiori app spreadsheet export (CSV). Stable, joined-and-cleaned.
Fallback: raw SUSG snapshot XML — DEFERRED to v0.2 (undocumented schema per
research-scmon-susg-verified.md).
"""

import csv
from pathlib import Path

from scripts.schemas import UsageRow


class UsageIngester:
    """Parse a CCM Fiori app CSV export OR fall back to raw SUSG XML (deferred)."""

    def load(self, path: Path | None) -> list[UsageRow]:
        if path is None or not path.exists():
            return []
        if path.suffix == ".csv":
            return self._parse_csv(path)
        if path.suffix == ".xml":
            return self._parse_susg_xml(path)
        raise ValueError(
            f"Unsupported usage file format: {path.suffix} "
            "(expected .csv from CCM Fiori app, or .xml for raw SUSG fallback)"
        )

    @staticmethod
    def _parse_csv(path: Path) -> list[UsageRow]:
        rows: list[UsageRow] = []
        with path.open(encoding="utf-8") as f:
            reader = csv.DictReader(f, delimiter=";")
            for row in reader:
                rows.append(UsageRow(
                    object_type=row["Object Type"].strip(),
                    object_name=row["Object Name"].strip(),
                    package=row.get("Package", "").strip(),
                    calls_12mo=int(row.get("Calls 12mo", "0") or "0"),
                    last_call=row.get("Last Call", "").strip(),
                ))
        return rows

    @staticmethod
    def _parse_susg_xml(path: Path) -> list[UsageRow]:
        # Raw SUSG XML schema is undocumented (per research-scmon-susg-verified.md).
        # Defer to schema-discovery in v0.2; for now, raise actionable error.
        raise NotImplementedError(
            "Raw SUSG XML parsing not in Plan 2 — please use CCM Fiori app export "
            "(SYCM_APS_FILE_SRV) which produces a CSV/XLSX with stable schema. "
            "See guide ccm-app-export."
        )
