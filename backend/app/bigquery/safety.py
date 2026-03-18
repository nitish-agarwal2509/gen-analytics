"""BigQuery safety checks -- DML detection, cost limits, row limits."""

import re

# DML/DDL patterns to reject
_DML_PATTERN = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|MERGE|GRANT|REVOKE)\b",
    re.IGNORECASE,
)

# Cost per TB scanned (on-demand pricing)
_COST_PER_TB = 6.25

# Default limits
DEFAULT_MAX_BYTES = 50 * 1024 ** 3  # 50 GB
DEFAULT_MAX_ROWS = 1000


def is_read_only(sql: str) -> tuple[bool, str | None]:
    """Check if SQL is read-only (no DML/DDL).

    Returns:
        (True, None) if safe, (False, error_message) if not.
    """
    match = _DML_PATTERN.search(sql)
    if match:
        return False, f"DML/DDL not allowed: '{match.group()}' detected. Only SELECT queries are permitted."
    return True, None


def check_cost_limit(estimated_bytes: int, max_bytes: int = DEFAULT_MAX_BYTES) -> tuple[bool, str | None]:
    """Check if estimated bytes are within the cost limit.

    Returns:
        (True, None) if under limit, (False, error_message) if over.
    """
    if estimated_bytes > max_bytes:
        est_gb = estimated_bytes / 1024 ** 3
        max_gb = max_bytes / 1024 ** 3
        est_cost = estimated_bytes * _COST_PER_TB / 1e12
        return False, (
            f"Query would scan {est_gb:.1f} GB (limit: {max_gb:.0f} GB, "
            f"estimated cost: ${est_cost:.4f}). Reduce scope or add filters."
        )
    return True, None


def estimate_cost_usd(estimated_bytes: int) -> float:
    """Estimate query cost in USD based on bytes scanned."""
    return estimated_bytes * _COST_PER_TB / 1e12


def enforce_row_limit(sql: str, max_rows: int = DEFAULT_MAX_ROWS) -> str:
    """Add LIMIT clause if missing from SQL."""
    # Simple check: if SQL doesn't end with a LIMIT clause, add one
    stripped = sql.strip().rstrip(";")
    if not re.search(r"\bLIMIT\s+\d+\s*$", stripped, re.IGNORECASE):
        return f"{stripped}\nLIMIT {max_rows}"
    return sql
