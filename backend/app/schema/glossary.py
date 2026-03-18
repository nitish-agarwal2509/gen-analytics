"""Load business glossary from YAML and format for system prompt injection."""

import os
import yaml


_GLOSSARY_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "data", "glossary", "business_terms.yaml"
)


def load_glossary(path: str | None = None) -> dict:
    """Load glossary YAML. Returns dict keyed by term name."""
    path = os.path.abspath(path or _GLOSSARY_PATH)
    if not os.path.exists(path):
        return {}
    with open(path) as f:
        return yaml.safe_load(f) or {}


def format_glossary_for_prompt(glossary: dict) -> str:
    """Format glossary into a compact prompt section."""
    if not glossary:
        return ""

    lines = []
    for term, info in glossary.items():
        definition = info.get("definition", "")
        sql_hint = info.get("sql_hint", "")
        synonyms = info.get("synonyms", [])
        tables = info.get("related_tables", [])

        parts = [f"- **{term}**: {definition}"]
        if sql_hint:
            parts.append(f"  SQL: {sql_hint}")
        if synonyms:
            parts.append(f"  Also: {', '.join(synonyms)}")
        if tables:
            parts.append(f"  Tables: {', '.join(tables)}")
        lines.append("\n".join(parts))

    return "\n".join(lines)
