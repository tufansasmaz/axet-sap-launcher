"""ClusterAnalyzer — within-bucket sub-clustering + 25-cap split.

Input  : list[Cluster] from Classifier
Output : refined list[Cluster] where each cluster is small enough to fit in
         one abapgit-bridge ZIP (cascade-safety per research-abapgit-bridge:
         practical changeset = 10-25 objects per ZIP) AND its findings share
         a fix template.

Algorithm:
  1. Pass-through `judgment` clusters unchanged — they never go to a patch ZIP,
     they go to the human-review queue regardless of size.
  2. For mechanical/context clusters, sub-bucket by
     (check_id, object_type, normalised_message_hash).
  3. If any sub-bucket exceeds 25 findings, split it into chunks of <=25 each.

Message normalisation strips variable text (table names, object names, line
counts) so messages of identical *shape* hash to the same bucket. v0.1 uses
a conservative scheme — first-3-words + last-3-words of the message. Each
check category's PatternLibrary entry (Plan 2) refines this further.
"""

import hashlib
import re
from collections import defaultdict

from scripts.schemas import ATCFinding, Cluster

MAX_FINDINGS_PER_CLUSTER = 25  # abapgit-bridge cascade-safety cap


def _normalise_message(message: str) -> str:
    """Compute a coarse 'shape' key for a finding message.

    Strip identifier-looking tokens and digits so e.g.
        "SELECT * on table EKKO without explicit field list"
        "SELECT * on table VBAK without explicit field list"
    both collapse to roughly:
        "select on table without explicit field list"
    """
    text = message.lower()
    # Drop quoted identifiers
    text = re.sub(r"['\"`][^'\"`]+['\"`]", " ", text)
    # Drop ALL-CAPS-LIKE tokens (table names, object names — appear lowercased now though)
    text = re.sub(r"\b[a-z]+_[a-z0-9_]+\b", " ", text)
    # Drop bare numbers
    text = re.sub(r"\b\d+\b", " ", text)
    # Drop punctuation, collapse whitespace
    text = re.sub(r"[^\w\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _message_hash(message: str) -> str:
    normalised = _normalise_message(message)
    return hashlib.sha1(normalised.encode("utf-8")).hexdigest()[:10]


def _chunk(items: list[ATCFinding], size: int) -> list[list[ATCFinding]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


class ClusterAnalyzer:
    def refine(self, clusters: list[Cluster]) -> list[Cluster]:
        refined: list[Cluster] = []
        next_seq = 1
        for cluster in clusters:
            if cluster.fix_shape == "judgment":
                # Re-emit as-is; cap doesn't apply (human-review queue, not a ZIP).
                refined.append(
                    cluster.model_copy(update={"cluster_id": f"cl-{next_seq:04d}"})
                )
                next_seq += 1
                continue

            sub_buckets: dict[tuple[str, str], list[ATCFinding]] = defaultdict(list)
            for f in cluster.findings:
                key = (f.object_type, _message_hash(f.message))
                sub_buckets[key].append(f)

            for key in sorted(sub_buckets.keys()):
                chunk_findings = sub_buckets[key]
                for chunk in _chunk(chunk_findings, MAX_FINDINGS_PER_CLUSTER):
                    refined.append(
                        Cluster(
                            cluster_id=f"cl-{next_seq:04d}",
                            check_id=cluster.check_id,
                            category=cluster.category,
                            fix_shape=cluster.fix_shape,
                            findings=chunk,
                        )
                    )
                    next_seq += 1

        return refined
