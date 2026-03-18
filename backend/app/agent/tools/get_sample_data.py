"""Get sample data tool -- preview rows from a BigQuery table."""

import re
from decimal import Decimal

from app.bigquery.client import get_client

# Only allow dataset.table format (prevent injection)
_TABLE_PATTERN = re.compile(r"^[\w]+\.[\w]+$")


def get_sample_data(table_name: str, limit: int = 5) -> dict:
    """Preview sample rows from a BigQuery table.

    Args:
        table_name: Fully qualified table name (dataset.table).
        limit: Number of rows to return (default 5, max 20).

    Returns:
        dict with keys: columns, rows
        On error: dict with key: error
    """
    if not _TABLE_PATTERN.match(table_name):
        return {"error": f"Invalid table name: {table_name}. Use format: dataset.table"}

    limit = min(limit, 20)

    try:
        client = get_client()
        sql = f"SELECT * FROM `{table_name}` LIMIT {limit}"
        results = client.query(sql).result()

        columns = [field.name for field in results.schema]
        rows = []
        for row in results:
            rows.append({col: _serialize(row[col]) for col in columns})

        return {"columns": columns, "rows": rows}
    except Exception as e:
        return {"error": str(e)}


def _serialize(value):
    """Convert BigQuery values to JSON-serializable types."""
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    if isinstance(value, Decimal):
        return float(value)
    return value
