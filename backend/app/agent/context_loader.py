"""Unified context loader -- assembles schema with enrichments."""

import json
import logging
import os

from app.schema.enrichments import load_enrichments
from app.schema.formatter import format_terse_schema, estimate_tokens

logger = logging.getLogger(__name__)

_SCHEMA_CACHE = os.path.join(
    os.path.dirname(__file__), "..", "..", "data", "schema_metadata.json"
)


def load_full_context() -> dict:
    """Load and assemble schema with enrichments for system prompt.

    Returns:
        dict with keys: schema, token_counts, total_tokens
    """
    schema_path = os.path.abspath(_SCHEMA_CACHE)
    if not os.path.exists(schema_path):
        raise FileNotFoundError(
            f"Schema cache not found at {schema_path}. "
            "Run: python scripts/extract_schema.py <datasets...>"
        )
    with open(schema_path) as f:
        metadata = json.load(f)

    enrichments = load_enrichments()
    schema_str = format_terse_schema(metadata, enrichments=enrichments)

    token_counts = {
        "schema": estimate_tokens(schema_str),
    }
    total = sum(token_counts.values())
    token_counts["total"] = total

    logger.info(f"Context loaded: schema={token_counts['schema']}t")

    return {
        "schema": schema_str,
        "token_counts": token_counts,
        "total_tokens": total,
    }
