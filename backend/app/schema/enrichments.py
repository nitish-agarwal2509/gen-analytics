"""Load table enrichments from YAML and merge into schema metadata."""

import os
import yaml


_ENRICHMENTS_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "data", "metadata", "table_enrichments.yaml"
)


def load_enrichments(path: str | None = None) -> dict:
    """Load table enrichments YAML. Returns dict keyed by full_table_name."""
    path = os.path.abspath(path or _ENRICHMENTS_PATH)
    if not os.path.exists(path):
        return {}
    with open(path) as f:
        return yaml.safe_load(f) or {}
