"""Pydantic models for the s4-migrator pipeline.

These are the typed inputs/outputs of the ingesters and downstream agents.
Schemas are defined as Pydantic v2 models for validation + serialisation.
"""

from typing import Literal

from pydantic import BaseModel, Field


class SimplificationItem(BaseModel):
    """One row from CCMSIDB."""

    sap_object_type: str = Field(min_length=1, max_length=4)
    sap_object_name: str = Field(min_length=1)
    simplification_category: str
    check_category: Literal[1, 2, 3]
    sap_note_number: int = Field(gt=0)
    sap_note_title: str
    target_releases: list[str] = Field(min_length=1)
    before_text: str = ""
    after_text: str = ""
    business_impact: str = ""


class ATCFinding(BaseModel):
    """One finding row from an ATC export XML."""

    run_id: str
    object_type: str = Field(min_length=1, max_length=4)
    object_name: str
    include: str = ""
    line: int = Field(ge=0)
    column: int = Field(ge=0)
    check_id: str
    priority: Literal[1, 2, 3]
    message: str
    sap_note: int | None = None
    exemption_status: str = ""


class UsageRow(BaseModel):
    """One row from SUSG / CCM Fiori app usage export."""

    object_type: str = Field(min_length=1, max_length=4)
    object_name: str
    package: str = ""
    calls_12mo: int = Field(ge=0)
    last_call: str = ""  # ISO date string; we don't parse since fixtures vary


class ReadinessTile(BaseModel):
    """One tile from a SAP Readiness Check XLSX export."""

    tile_name: str   # e.g. "sizing", "custom-code-atc"
    rows: list[dict[str, str | int | float | None]]


class NoteText(BaseModel):
    """One SAP Note (cleaned plain text)."""

    note_number: int = Field(gt=0)
    text: str
    source_format: str  # "pdf" or "html"


class SICheckFinding(BaseModel):
    """One row from a Simplification Item Check run (/SDF/RC_START_CHECK).

    The Simplification Database says what SAP simplified. This says what the
    CUSTOMER'S system does about it -- an item can be catalogued and irrelevant
    here, or catalogued and blocking. A conversion is not scoped without both.

    `status_raw` is kept beside the normalised `status` deliberately. SAP writes
    the column differently depending on release and logon language, and a value
    this ingester could not map is worth more in the report than a silent
    "unknown": it is the string someone needs to see to extend _STATUS.
    """

    item_id: str = Field(min_length=1)
    title: str = ""
    status: Literal["error", "warning", "info", "ok", "not-relevant", "unknown"]
    status_raw: str = ""
    message: str = ""
    sap_note_number: int | None = None
    affected_count: int | None = None
    area: str = ""


class SICheckAction(BaseModel):
    """The judgment an SI Check error needs: whose problem is it, and what next.

    Which team owns a simplification item is not derivable from the export. It
    depends on what the item touches in THIS customer's system -- the same item
    is a Basis task on one project and a functional redesign on another.
    """

    team: Literal["abap", "basis", "functional", "mixed"]
    severity: Literal["stopper", "high", "medium", "informational"]
    steps: str
    reasoning: str


class ImpactClassification(BaseModel):
    """One judgment: how much a simplification item costs this customer.

    This used to live in judges/impact_mapper.py next to the prompt that
    produced it. The prompt is gone -- the agent reading SKILL.md makes the call
    now and hands the answer back through judgment-answers.json -- but the SHAPE
    is still the contract two deliverable writers are built on
    (exec_summary.py, fix_backlog.py), so it belongs with the other models.

    `confidence` is the agent's own, and it is written into fix-backlog.csv
    rather than used to filter: a low-confidence classification the consultant
    can see and overrule beats one silently dropped.
    """

    impact: Literal["high", "medium", "low"]
    effort: Literal["S", "M", "L"]
    confidence: float = Field(ge=0, le=1)
    reasoning: str


class SchemaUnknown(Exception):
    """Raised when an ingester encounters an XML root/element it doesn't recognise.

    Caller (the orchestrator) should fall back to the schema-discovery flow.
    """

    def __init__(self, source: str, unknown_root: str):
        self.source = source
        self.unknown_root = unknown_root
        super().__init__(f"{source}: unknown root element '{unknown_root}'")
