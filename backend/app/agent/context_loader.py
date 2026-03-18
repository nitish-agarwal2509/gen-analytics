"""Unified context loader -- assembles schema + enrichments + glossary + examples."""

import json
import logging
import os

from app.schema.enrichments import load_enrichments
from app.schema.examples import load_examples, format_examples_for_prompt
from app.schema.formatter import format_terse_schema, estimate_tokens
from app.schema.glossary import load_glossary, format_glossary_for_prompt

logger = logging.getLogger(__name__)

_SCHEMA_CACHE = os.path.join(
    os.path.dirname(__file__), "..", "..", "data", "schema_metadata.json"
)

_TOKEN_BUDGET_WARN = 50_000


def load_full_context() -> dict:
    """Load and assemble all context pieces for system prompt.

    Returns:
        dict with keys: schema, glossary, examples, token_counts, total_tokens
    """
    # 1. Schema metadata
    schema_path = os.path.abspath(_SCHEMA_CACHE)
    if not os.path.exists(schema_path):
        raise FileNotFoundError(
            f"Schema cache not found at {schema_path}. "
            "Run: python scripts/extract_schema.py <datasets...>"
        )
    with open(schema_path) as f:
        metadata = json.load(f)

    # 2. Enrichments
    enrichments = load_enrichments()

    # 3. Format terse schema with enrichments
    schema_str = format_terse_schema(metadata, enrichments=enrichments)

    # 4. Glossary
    glossary_data = load_glossary()
    glossary_str = format_glossary_for_prompt(glossary_data)

    # 5. Examples
    examples_data = load_examples()
    examples_str = format_examples_for_prompt(examples_data)

    # 6. Token counts
    token_counts = {
        "schema": estimate_tokens(schema_str),
        "glossary": estimate_tokens(glossary_str),
        "examples": estimate_tokens(examples_str),
    }
    total = sum(token_counts.values())
    token_counts["total"] = total

    if total > _TOKEN_BUDGET_WARN:
        logger.warning(f"Context exceeds budget: {total} tokens (limit: {_TOKEN_BUDGET_WARN})")

    logger.info(
        f"Context loaded: schema={token_counts['schema']}t, "
        f"glossary={token_counts['glossary']}t, "
        f"examples={token_counts['examples']}t, "
        f"total={total}t"
    )

    return {
        "schema": schema_str,
        "glossary": glossary_str,
        "examples": examples_str,
        "token_counts": token_counts,
        "total_tokens": total,
    }
