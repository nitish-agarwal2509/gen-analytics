"""Execute SQL tool -- runs read-only queries against BigQuery."""

import re

from google.cloud import bigquery

from app.bigquery.client import get_client

# DML/DDL patterns to reject
_DML_PATTERN = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|MERGE|GRANT|REVOKE)\b",
    re.IGNORECASE,
)


def execute_sql(sql: str, max_rows: int = 100) -> dict:
    """Execute a read-only SQL query against BigQuery.

    Args:
        sql: The SQL query to execute (SELECT only).
        max_rows: Maximum number of rows to return (default 100).

    Returns:
        dict with keys: columns, rows, total_rows, bytes_processed
        On error: dict with key: error
    """
    # Safety: reject DML/DDL
    if _DML_PATTERN.search(sql):
        return {"error": "DML/DDL not allowed. Only SELECT queries are permitted."}

    try:
        client = get_client()
        query_job = client.query(sql)
        results = query_job.result()

        columns = [field.name for field in results.schema]
        rows = []
        for i, row in enumerate(results):
            if i >= max_rows:
                break
            rows.append({col: _serialize(row[col]) for col in columns})

        return {
            "columns": columns,
            "rows": rows,
            "total_rows": results.total_rows,
            "bytes_processed": query_job.total_bytes_processed,
        }
    except Exception as e:
        return {"error": str(e)}


def _serialize(value):
    """Convert BigQuery values to JSON-serializable types."""
    from decimal import Decimal
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    if isinstance(value, Decimal):
        return float(value)
    return value
