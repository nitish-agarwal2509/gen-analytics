"""Validate SQL tool -- dry-run queries against BigQuery to check syntax and estimate cost."""

from app.bigquery.client import get_client
from app.bigquery.safety import is_read_only, check_cost_limit, estimate_cost_usd
from google.cloud.bigquery import QueryJobConfig


def validate_sql(sql: str) -> dict:
    """Validate a SQL query via BigQuery dry-run without executing it.

    Args:
        sql: The SQL query to validate.

    Returns:
        dict with keys: is_valid, errors (list), estimated_bytes, estimated_cost_usd
        If valid: {is_valid: True, estimated_bytes: N, estimated_cost_usd: N}
        If invalid: {is_valid: False, errors: ["..."]}
    """
    errors = []

    # 1. DML/DDL check
    safe, msg = is_read_only(sql)
    if not safe:
        return {"is_valid": False, "errors": [msg]}

    # 2. BigQuery dry-run
    try:
        client = get_client()
        job_config = QueryJobConfig(dry_run=True, use_query_cache=False)
        query_job = client.query(sql, job_config=job_config)

        estimated_bytes = query_job.total_bytes_processed or 0
        cost_usd = estimate_cost_usd(estimated_bytes)

        # 3. Cost limit check
        under_limit, cost_msg = check_cost_limit(estimated_bytes)
        if not under_limit:
            return {
                "is_valid": False,
                "errors": [cost_msg],
                "estimated_bytes": estimated_bytes,
                "estimated_cost_usd": cost_usd,
            }

        return {
            "is_valid": True,
            "errors": [],
            "estimated_bytes": estimated_bytes,
            "estimated_cost_usd": cost_usd,
        }

    except Exception as e:
        error_str = str(e)
        # Extract just the useful error message from BigQuery exceptions
        if "400" in error_str and ":" in error_str:
            # BigQuery errors often have format "400 message"
            parts = error_str.split("\n")
            errors.append(parts[0] if parts else error_str)
        else:
            errors.append(error_str)

        return {"is_valid": False, "errors": errors}
