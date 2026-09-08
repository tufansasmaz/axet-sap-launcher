"""Deterministic Classifier — buckets ATCFinding rows by check_id and fix_shape.

Input  : list[ATCFinding]
Output : list[Cluster] (one per distinct check_id encountered)

Decision rules (no LLM):
  - check_id matches a substring in BATCH_FIXABLE -> fix_shape per entry
  - check_id matches a substring in HUMAN_REVIEW   -> fix_shape "judgment"
  - otherwise                                       -> fix_shape "judgment"
    and emit a LOGEVENT line so the consultant can extend the catalogue
    via /atc-batch-remediator:propose-improvement

The 10 batch-fixable + 5 judgment categories are derived from
research-pattern-library.md (top 15 ATC categories, v0.1 ship list).
"""

from collections import defaultdict

from scripts.schemas import ATCFinding, Cluster

# Substring patterns to match against ATC check_id.
# fix_shape per category — sourced from research-pattern-library.md
# (mechanical = pure syntactic; context = needs surrounding-code lookup;
# judgment = semantic decision required — route to human review).
BATCH_FIXABLE: dict[str, tuple[str, str]] = {
    # substring                              -> (category-slug, fix_shape)
    "SELECT_STAR":                            ("select-star",        "context"),
    "MISSING_INTO_LIST":                      ("into-list",          "mechanical"),
    "MISSING_ORDER_BY":                       ("order-by",           "context"),
    "MATNR_EXT":                              ("matnr-ext",          "mechanical"),
    "FLDEXT":                                 ("matnr-ext",          "mechanical"),
    "OBSOLETE_STATEMENTS::TABLES":            ("tables-to-changing", "context"),
    "OBSOLETE_FM":                            ("deprecated-fm",      "mechanical"),
    "Y_CHECK_FUNCTION_USAGE":                 ("deprecated-fm",      "mechanical"),
    "Y_CHECK_PARAMETER_TYPING":               ("param-typing",       "context"),
    "untyped_parameter":                      ("param-typing",       "context"),
    "SLIN_UNUSED_VAR":                        ("unused-vars",        "mechanical"),
    "Y_CHECK_SCOPE_OF_VARIABLE":              ("unused-vars",        "mechanical"),
    "Y_CHECK_CHECK_STATEMENT_POS":            ("check-top-of-form",  "context"),
    "Y_CHECK_CHECK_IN_LOOP":                  ("check-top-of-form",  "context"),
    "SELECT_IN_LOOP":                         ("nested-select-fae",  "context"),
    "DB_SEL_NESTED_LOOPS":                    ("nested-select-fae",  "context"),
}

# Categorically-judgment categories (route to human-review queue; no LLM draft in v0.1).
HUMAN_REVIEW: dict[str, str] = {
    "USAGE_OF_RELEASED_APIS":      "released-apis-only",
    "ABAP_CLOUD_READINESS":        "released-apis-only",
    "OBSOLETE_TYPE":               "transitive-type",
    "Y_CHECK_CHAIN_DECLARATION":   "transitive-type",
    "HARDCODED_CLIENT":            "hardcoded-values",
    "Y_CHECK_HARDCODED_VALUE":     "hardcoded-values",
    "Y_CHECK_MAGIC_NUMBER":        "hardcoded-values",
    "CRITICAL_STATEMENTS":         "direct-sap-dml",
    "Y_CHECK_DIRECT_SAP_DB_MODIFY": "direct-sap-dml",
    "AUTHORITY_CHECK":             "missing-authority-check",
    "AUTH_CHECK_MISSING":          "missing-authority-check",
}


def _log(event: str) -> None:
    """Stdout journal line; PostToolUse hook (Plan 3) parses these."""
    print(f"LOGEVENT: {event}", flush=True)


def _classify_one(check_id: str) -> tuple[str, str]:
    """Return (category-slug, fix_shape) for a single check_id.

    Resolution order: BATCH_FIXABLE wins over HUMAN_REVIEW; first match wins.
    Unknown -> ("unknown", "judgment") + LOGEVENT.
    """
    for substr, (cat, shape) in BATCH_FIXABLE.items():
        if substr in check_id:
            return cat, shape
    for substr, cat in HUMAN_REVIEW.items():
        if substr in check_id:
            return cat, "judgment"
    _log(
        f"Classifier: unknown check_id {check_id} -- routing to human review "
        "(extend BATCH_FIXABLE/HUMAN_REVIEW in scripts/classifier.py)"
    )
    return "unknown", "judgment"


class Classifier:
    """Group findings by check_id and tag each cluster with its fix_shape."""

    def classify(self, findings: list[ATCFinding]) -> list[Cluster]:
        by_check: dict[str, list[ATCFinding]] = defaultdict(list)
        for f in findings:
            by_check[f.check_id].append(f)

        clusters: list[Cluster] = []
        # Deterministic ordering: sort by check_id so cluster_id assignment is stable.
        for idx, check_id in enumerate(sorted(by_check.keys()), start=1):
            category, fix_shape = _classify_one(check_id)
            clusters.append(
                Cluster(
                    cluster_id=f"cl-{idx:04d}",
                    check_id=check_id,
                    category=category,
                    fix_shape=fix_shape,  # type: ignore[arg-type]
                    findings=by_check[check_id],
                )
            )
        return clusters
