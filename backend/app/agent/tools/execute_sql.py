"""Execute SQL tool -- runs read-only queries against BigQuery."""

from decimal import Decimal

from google.cloud.bigquery import QueryJobConfig

from app.bigquery.client import get_client
from app.bigquery.safety import is_read_only, DEFAULT_MAX_BYTES


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
    safe, msg = is_read_only(sql)
    if not safe:
        return {"error": msg}

    try:
        client = get_client()
        job_config = QueryJobConfig(maximum_bytes_billed=DEFAULT_MAX_BYTES)
        query_job = client.query(sql, job_config=job_config)
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
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    if isinstance(value, Decimal):
        return float(value)
    return value
