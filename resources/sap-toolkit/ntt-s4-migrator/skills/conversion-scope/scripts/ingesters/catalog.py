"""CCMSIDB ZIP → list[SimplificationItem].

CCMSIDB XML schema is NOT publicly documented (per research-ccmsidb-verified.md).
We default to a known schema and fall back to schema-discovery on unknown roots.
"""

import zipfile
from pathlib import Path
from typing import Literal, cast

from lxml import etree

from scripts.schemas import SchemaUnknown, SimplificationItem

# Known root element names we've seen in the wild.
# Add more here when discover_schema captures new variants.
KNOWN_ROOTS = {"SimplificationItems", "SimplificationCatalog"}


class CatalogIngester:
    """Parse a CCMSIDB ZIP and return validated SimplificationItem records."""

    def __init__(self, *, skip_discovery: bool = False) -> None:
        self.skip_discovery = skip_discovery

    def load(self, zip_path: Path) -> list[SimplificationItem]:
        try:
            with zipfile.ZipFile(zip_path) as zf:
                xml_names = [n for n in zf.namelist() if n.endswith(".xml")]
                if not xml_names:
                    raise ValueError(
                        f"CCMSIDB ZIP {zip_path} contains no XML files. "
                        "Please re-download from SAP for Me Software Download Center "
                        "(KBA 3693326)."
                    )
                items: list[SimplificationItem] = []
                for name in xml_names:
                    with zf.open(name) as xml_file:
                        items.extend(self._parse_xml(xml_file.read(), source=str(zip_path)))
                return items
        except zipfile.BadZipFile as exc:
            raise ValueError(
                f"CCMSIDB ZIP {zip_path} is corrupt or truncated. "
                "Please re-download from SAP for Me."
            ) from exc

    def _parse_xml(self, xml_bytes: bytes, source: str) -> list[SimplificationItem]:
        try:
            root = etree.fromstring(xml_bytes)
        except etree.XMLSyntaxError as exc:
            raise ValueError(
                f"CCMSIDB XML in {source} is malformed: {exc}. "
                "Please re-download from SAP for Me."
            ) from exc

        if root.tag not in KNOWN_ROOTS:
            if self.skip_discovery:
                raise SchemaUnknown("ccmsidb", root.tag)
            # In Plan 1 we don't auto-discover; just re-raise.
            # Discovery flow is added in a later plan.
            raise SchemaUnknown("ccmsidb", root.tag)

        return [self._parse_item(item) for item in root.findall("Item")]

    @staticmethod
    def _parse_item(node: etree._Element) -> SimplificationItem:
        def text(tag: str) -> str:
            return (node.findtext(tag) or "").strip()

        target_releases = [el.text.strip() for el in node.findall("TargetRelease") if el.text]
        return SimplificationItem(
            sap_object_type=text("ObjectType"),
            sap_object_name=text("ObjectName"),
            simplification_category=text("Category"),
            check_category=cast(Literal[1, 2, 3], int(text("CheckCategory") or "3")),
            sap_note_number=int(text("NoteNumber") or "0"),
            sap_note_title=text("NoteTitle"),
            target_releases=target_releases or ["unknown"],
            before_text=text("BeforeText"),
            after_text=text("AfterText"),
            business_impact=text("BusinessImpact"),
        )
