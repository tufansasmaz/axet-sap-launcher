"""ATC export ZIP → list[ATCFinding].

ATC export XML schema (the "Export to File for SAP Readiness Check" format)
is NOT publicly documented. See docs/specs/.../research-atc-verified.md.
"""

import zipfile
from pathlib import Path
from typing import Literal, cast

from lxml import etree

from scripts.schemas import ATCFinding, SchemaUnknown

KNOWN_ROOTS = {"results", "atc:results", "reportV2"}


class ATCIngester:
    def __init__(self, *, skip_discovery: bool = False) -> None:
        self.skip_discovery = skip_discovery

    def load(self, zip_path: Path) -> list[ATCFinding]:
        try:
            with zipfile.ZipFile(zip_path) as zf:
                xml_names = [n for n in zf.namelist() if n.endswith(".xml")]
                if not xml_names:
                    raise ValueError(
                        f"ATC export ZIP {zip_path} contains no XML files. "
                        "Please re-export via Tx ATC → Manage Results → Export to → "
                        "File for SAP Readiness Check."
                    )
                findings: list[ATCFinding] = []
                for name in xml_names:
                    with zf.open(name) as xml_file:
                        findings.extend(self._parse_xml(xml_file.read()))
                return findings
        except zipfile.BadZipFile as exc:
            raise ValueError(
                f"ATC export ZIP {zip_path} is corrupt. Please re-export from Tx ATC."
            ) from exc

    def _parse_xml(self, xml_bytes: bytes) -> list[ATCFinding]:
        try:
            root = etree.fromstring(xml_bytes)
        except etree.XMLSyntaxError as exc:
            raise ValueError(
                f"ATC XML is malformed: {exc}. Please re-export from Tx ATC."
            ) from exc

        # Strip namespace from local tag name for matching
        local_tag = etree.QName(root.tag).localname
        candidates = {local_tag, root.tag}
        if not (candidates & KNOWN_ROOTS):
            if self.skip_discovery:
                raise SchemaUnknown("atc", root.tag)
            # In Plan 1 we don't auto-discover; just re-raise.
            # Discovery flow is added in a later plan.
            raise SchemaUnknown("atc", root.tag)

        run_id = ""
        run_node = root.find(".//{*}run")
        if run_node is not None:
            run_id = run_node.get("id", "")

        findings: list[ATCFinding] = []
        for f in root.findall(".//{*}finding"):
            findings.append(self._parse_finding(f, run_id))
        return findings

    @staticmethod
    def _parse_finding(node: etree._Element, run_id: str) -> ATCFinding:
        def text(tag: str) -> str:
            return (node.findtext(tag) or "").strip()

        sap_note_str = text("sapNote")
        return ATCFinding(
            run_id=run_id,
            object_type=text("objectType"),
            object_name=text("objectName"),
            include=text("include"),
            line=int(text("line") or "0"),
            column=int(text("column") or "0"),
            check_id=text("checkId"),
            priority=cast(Literal[1, 2, 3], int(text("priority") or "3")),
            message=text("message"),
            sap_note=int(sap_note_str) if sap_note_str.isdigit() else None,
        )
