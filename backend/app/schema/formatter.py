"""Format BigQuery metadata into a compact, token-efficient terse schema string."""

# Type abbreviations to save tokens
_TYPE_MAP = {
    "STRING": "STR",
    "INT64": "INT",
    "FLOAT64": "FLOAT",
    "NUMERIC": "NUM",
    "BIGNUMERIC": "BIGNUM",
    "BOOL": "BOOL",
    "BOOLEAN": "BOOL",
    "TIMESTAMP": "TS",
    "DATETIME": "DT",
    "DATE": "DATE",
    "TIME": "TIME",
    "BYTES": "BYTES",
    "JSON": "JSON",
    "GEOGRAPHY": "GEO",
    "RECORD": "RECORD",
    "STRUCT": "STRUCT",
}


def _abbreviate_type(data_type: str) -> str:
    """Convert BigQuery type to short abbreviation."""
    # Handle ARRAY<X> and STRUCT<...>
    upper = data_type.upper()
    if upper.startswith("ARRAY<"):
        inner = upper[6:-1]  # strip ARRAY< and >
        return f"ARR<{_abbreviate_type(inner)}>"
    return _TYPE_MAP.get(upper, upper)


def _human_row_count(n: int) -> str:
    """Format row count as human-readable string."""
    if n >= 1_000_000_000:
        return f"{n / 1_000_000_000:.1f}B"
    if n >= 1_000_000:
        return f"{n / 1_000_000:.0f}M"
    if n >= 1_000:
        return f"{n / 1_000:.0f}K"
    return str(n)


def format_terse_schema(metadata: list[dict]) -> str:
    """Convert metadata list into a compact terse schema string.

    Format per table (one line):
        dataset.table (~NM rows): col1(TYPE), col2(TYPE), ...

    Args:
        metadata: List of table metadata dicts from extract_all_metadata().

    Returns:
        Terse schema string ready for system prompt injection.
    """
    lines = []
    current_dataset = None

    for table in metadata:
        # Add dataset header when dataset changes
        if table["dataset"] != current_dataset:
            current_dataset = table["dataset"]
            lines.append(f"\n## {current_dataset}")

        cols = ", ".join(
            f"{c['name']}({_abbreviate_type(c['type'])})"
            for c in table["columns"]
        )
        row_str = _human_row_count(table["row_count"])
        lines.append(f"{table['full_name']} (~{row_str} rows): {cols}")

    return "\n".join(lines).strip()


def estimate_tokens(text: str) -> int:
    """Rough token estimate (~4 chars per token for English/code)."""
    return len(text) // 4
