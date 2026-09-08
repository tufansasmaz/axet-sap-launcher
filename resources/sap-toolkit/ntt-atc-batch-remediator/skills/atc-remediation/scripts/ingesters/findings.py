"""ATC export ZIP → list[ATCFinding].

Mirrors the parsing approach used by ntt-s4-migrator's ATCIngester:
- lxml XML parsing
- KNOWN_ROOTS set; raise SchemaUnknown on unknown root (no discovery in v0.1)
- Actionable ValueError on bad zip / malformed XML pointing at the SAP
  re-export workflow

Adds `finding_id` parsing — a stable per-finding ID from the ATC export
that downstream agents use as the audit key.
"""

import zipfile
from pathlib import Path
from typing import Literal, cast

from lxml import etree  # type: ignore[import-untyped]

from scripts.schemas import ATCFinding, SchemaUnknown

KNOWN_ROOTS = {"results", "atc:results", "reportV2"}

# Hardened XML parser: resolve_entities=False blocks XXE (external-entity
# expansion → SSRF / local-file disclosure), no_network=True blocks network
# fetches, load_dtd=False blocks external DTD subset loading. lxml's default
# parser has entity resolution enabled, so a malicious ATC export carrying a
# DOCTYPE with `<!ENTITY xxe SYSTEM "file:///etc/passwd">` would otherwise
# leak file contents into finding messages.
_PARSER = etree.XMLParser(
    resolve_entities=False,
    no_network=True,
    load_dtd=False,
)


class FindingsIngester:
    def __init__(self, *, skip_discovery: bool = False) -> None:
        self.skip_discovery = skip_discovery

    def load(self, zip_path: Path) -> list[ATCFinding]:
        try:
            with zipfile.ZipFile(zip_path) as zf:
                xml_names = [n for n in zf.namelist() if n.endswith(".xml")]
                if not xml_names:
                    raise ValueError(
                        f"ATC export ZIP {zip_path} contains no XML files. "
                        "Please re-export via Tx ATC -> Manage Results -> "
                        "Export to -> File for SAP Readiness Check."
                    )
                findings: list[ATCFinding] = []
                for name in xml_names:
                    with zf.open(name) as xml_file:
                        findings.extend(self._parse_xml(xml_file.read()))
                return findings
        except zipfile.BadZipFile as exc:
            raise ValueError(
                f"ATC export ZIP {zip_path} is corrupt or truncated. "
                "Please re-export from Tx ATC."
            ) from exc

    def _parse_xml(self, xml_bytes: bytes) -> list[ATCFinding]:
        try:
            root = etree.fromstring(xml_bytes, _PARSER)
        except etree.XMLSyntaxError as exc:
            raise ValueError(
                f"ATC XML is malformed: {exc}. Please re-export from Tx ATC."
            ) from exc

        local_tag = etree.QName(root.tag).localname
        candidates = {local_tag, root.tag}
        if not (candidates & KNOWN_ROOTS):
            # No discovery flow in v0.1 (deferred to v0.2) — raise regardless of flag.
            raise SchemaUnknown("atc", root.tag)

        run_id = ""
        run_node = root.find(".//{*}run")
        if run_node is not None:
            run_id = run_node.get("id", "")

        findings: list[ATCFinding] = []
        for seq, f in enumerate(root.findall(".//{*}finding")):
            findings.append(self._parse_finding(f, run_id, seq))
        return findings

    @staticmethod
    def _parse_finding(node: etree._Element, run_id: str, seq: int) -> ATCFinding:
        def text(tag: str) -> str:
            return (node.findtext(f"{{*}}{tag}") or "").strip()

        sap_note_str = text("sapNote")
        finding_id_str = text("findingId")
        # Synthesize a stable per-finding id when the ATC export omits
        # <findingId>: f"{run_id}:{seq}". Downstream (ConfidenceJudge,
        # audit-trail, human-review queue) all key on finding_id, so a None
        # would silently drop the finding instead of routing it.
        if not finding_id_str:
            finding_id_str = f"{run_id or 'R-0'}:{seq}"
        priority_int = int(text("priority") or "3")
        return ATCFinding(
            run_id=run_id,
            object_type=text("objectType"),
            object_name=text("objectName"),
            include=text("include"),
            line=int(text("line") or "0"),
            column=int(text("column") or "0"),
            check_id=text("checkId"),
            priority=cast(Literal[1, 2, 3], priority_int),
            message=text("message"),
            sap_note=int(sap_note_str) if sap_note_str.isdigit() else None,
            finding_id=finding_id_str,
        )
