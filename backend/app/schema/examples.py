"""Load few-shot SQL examples from YAML and format for system prompt injection."""

import os
import yaml


_EXAMPLES_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "data", "examples", "query_examples.yaml"
)


def load_examples(path: str | None = None) -> list[dict]:
    """Load examples YAML. Returns list of example dicts."""
    path = os.path.abspath(path or _EXAMPLES_PATH)
    if not os.path.exists(path):
        return []
    with open(path) as f:
        return yaml.safe_load(f) or []


def format_examples_for_prompt(examples: list[dict]) -> str:
    """Format examples into a compact prompt section."""
    if not examples:
        return ""

    lines = []
    for ex in examples:
        question = ex.get("question", "")
        sql = ex.get("sql", "").strip()
        explanation = ex.get("explanation", "")
        complexity = ex.get("complexity", "")

        header = f"Q: {question}"
        if complexity:
            header += f" [{complexity}]"
        lines.append(header)
        lines.append(f"```sql\n{sql}\n```")
        if explanation:
            lines.append(f"Note: {explanation}")
        lines.append("")

    return "\n".join(lines)
