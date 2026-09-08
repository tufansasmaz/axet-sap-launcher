"""Pydantic v2 models for the atc-batch-remediator pipeline.

Typed inputs/outputs of the deterministic and LLM-driven agents.
SchemaUnknown is the schema-discovery escape hatch — raised by ingesters
when they encounter an XML root they don't recognise; carries both
source identifier and tag for actionable diagnostics.
"""

from typing import Literal

from pydantic import BaseModel, Field


class ATCFinding(BaseModel):
    """One finding row from an ATC export XML."""

    run_id: str
    object_type: str = Field(min_length=1, max_length=4)
    object_name: str = Field(min_length=1)
    include: str = ""
    line: int = Field(ge=0)
    column: int = Field(ge=0)
    check_id: str = Field(min_length=1)
    priority: Literal[1, 2, 3]
    message: str
    sap_note: int | None = None
    finding_id: str | None = None


class Cluster(BaseModel):
    """A bucket of findings grouped by check_id and fix shape.

    Produced by Classifier (one Cluster per known check_id); refined by
    ClusterAnalyzer (may split a Cluster into multiple sub-Clusters when
    findings exceed 25, the abapgit-bridge cascade-safety cap).
    """

    cluster_id: str = Field(min_length=1)
    check_id: str = Field(min_length=1)
    category: str = Field(min_length=1)
    fix_shape: Literal["mechanical", "context", "judgment"]
    findings: list[ATCFinding] = Field(min_length=1)


class Patch(BaseModel):
    """One generated ABAP patch — produced by PatchGenerator in Plan 2.

    Plan-1 keeps ``patch_id``/``cluster_id``/``abapgit_path`` (legacy fields used by
    early scaffolding); Plan-2 introduces ``include``/``line``/``pattern_slug``/
    ``finding_id`` so the patch carries enough context for ConfidenceJudge,
    ZipBundler and audit-trail emission.
    """

    patch_id: str = ""
    cluster_id: str = ""
    object_type: str = Field(min_length=1, max_length=4)
    # ABAP identifier charset: upper-case Latin + digits + underscore + slash
    # (slash allows namespaced identifiers like /CUSTNS/ZCL_FOO). Pinned to
    # 1..30 chars to match the SAP DDIC limit. ZipBundler interpolates this
    # value into output paths, so the pattern is also a path-traversal guard.
    object_name: str = Field(min_length=1, max_length=30, pattern=r"^[A-Z][A-Z0-9_/]{0,29}$")
    include: str = ""
    line: int = Field(ge=0, default=0)
    before_text: str
    after_text: str
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str = ""
    abapgit_path: str = ""
    # Kebab-case ASCII slug matching the references/patterns/<slug>.yaml
    # stems. Pinned to 1..64 chars. ZipBundler interpolates this value into
    # output ZIP filenames, so the pattern is also a path-traversal guard.
    pattern_slug: str = Field(default="", pattern=r"^[a-z0-9][a-z0-9-]{0,63}$|^$")
    finding_id: str = ""


class PatchBatch(BaseModel):
    """Output container from PatchGenerator: zero or more patches per cluster."""

    patches: list[Patch] = Field(default_factory=list)


class PatternTemplate(BaseModel):
    """Before/after ABAP snippets carried by each pattern YAML."""

    before: str = Field(min_length=1)
    after: str = Field(min_length=1)


class ConfidenceSignals(BaseModel):
    """High/low confidence signal strings the PatchGenerator prompt cites."""

    high: list[str] = Field(default_factory=list)
    low: list[str] = Field(default_factory=list)


class Pattern(BaseModel):
    """One pattern YAML loaded into memory.

    ``slug`` is populated at load time from the file stem (not stored in the
    YAML body) so the rest of the pipeline never has to recompute it.
    """

    check_ids: list[str] = Field(min_length=1)
    priority: Literal[1, 2, 3]
    fix_shape: Literal["mechanical", "context", "judgment"]
    template: PatternTemplate
    context_required: list[str] = Field(default_factory=list)
    confidence_signals: ConfidenceSignals = Field(default_factory=ConfidenceSignals)
    fallback_on_low_confidence: Literal["route_to_human_review"] = "route_to_human_review"
    sap_note: int | None = None
    sap_note_secondary: int | None = None
    slug: str = ""


class FMReplacement(BaseModel):
    """One row of the deprecated-FM → released-API lookup."""

    deprecated_fm: str = Field(min_length=1)
    replacement_kind: Literal["class_method", "function_module", "none"]
    replacement_expression: str = ""
    notes: str = ""
    sap_note: int | None = None


class RoutedFinding(BaseModel):
    """A finding that didn't make it into the ship-set ZIPs.

    ``reason_routed`` is the column emitted to the human-review CSV; the
    consultant uses ``suggested_action`` as the starting point for triage.
    """

    finding: ATCFinding
    reason_routed: Literal[
        "low-confidence",
        "categorically-judgment",
        "no-patch-produced",
    ]
    confidence: float | None = None
    suggested_action: str = ""


class ConfidenceJudgeResult(BaseModel):
    """Output of ConfidenceJudge: ship-set patches + human-review-set findings."""

    patches_for_zip: list[Patch] = Field(default_factory=list)
    findings_for_human_review: list[RoutedFinding] = Field(default_factory=list)


class ZipBundleManifest(BaseModel):
    """One manifest entry per ZIP that ZipBundler writes to disk."""

    batch_id: str
    category_slug: str
    object_count: int = Field(ge=0)
    zip_path: str
    included_finding_ids: list[str] = Field(default_factory=list)


class SchemaUnknown(Exception):
    """Raised when an ingester encounters an XML root it doesn't recognise.

    Caller should either route to schema-discovery (v0.2) or raise HARD error
    with the `source` + `unknown_root` so the consultant can extend KNOWN_ROOTS.
    """

    def __init__(self, source: str, unknown_root: str) -> None:
        self.source = source
        self.unknown_root = unknown_root
        super().__init__(f"{source}: unknown root element '{unknown_root}'")
