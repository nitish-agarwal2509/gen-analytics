"""Extract table and column metadata from BigQuery INFORMATION_SCHEMA."""

from app.bigquery.client import get_client


def extract_dataset_metadata(dataset_id: str) -> list[dict]:
    """Extract table and column metadata for all tables in a dataset.

    Args:
        dataset_id: BigQuery dataset ID.

    Returns:
        List of dicts, each with keys:
            table_name, dataset, full_name, row_count, size_bytes,
            columns: [{name, type, description}]
    """
    client = get_client()
    project = client.project

    # Detect dataset location for INFORMATION_SCHEMA queries
    ds = client.get_dataset(dataset_id)
    loc = ds.location

    # Backtick-quote project name (may contain hyphens)
    proj = f"`{project}`"

    # Get table names
    tables_query = f"""
    SELECT table_name
    FROM {proj}.{dataset_id}.INFORMATION_SCHEMA.TABLES
    WHERE table_type IN ('BASE TABLE', 'VIEW')
    ORDER BY table_name
    """

    # Get column-level metadata
    columns_query = f"""
    SELECT
        table_name,
        column_name,
        data_type
    FROM {proj}.{dataset_id}.INFORMATION_SCHEMA.COLUMNS
    ORDER BY table_name, ordinal_position
    """

    tables_result = client.query(tables_query, location=loc).result()
    columns_result = client.query(columns_query, location=loc).result()

    # Index columns by table
    columns_by_table: dict[str, list[dict]] = {}
    for row in columns_result:
        table = row.table_name
        if table not in columns_by_table:
            columns_by_table[table] = []
        columns_by_table[table].append({
            "name": row.column_name,
            "type": row.data_type,
        })

    # Build table metadata (get row counts via API)
    metadata = []
    for row in tables_result:
        table_name = row.table_name
        try:
            tbl_ref = client.get_table(f"{project}.{dataset_id}.{table_name}")
            row_count = tbl_ref.num_rows or 0
            size_bytes = tbl_ref.num_bytes or 0
        except Exception:
            row_count = 0
            size_bytes = 0
        metadata.append({
            "table_name": table_name,
            "dataset": dataset_id,
            "full_name": f"{dataset_id}.{table_name}",
            "row_count": row_count,
            "size_bytes": size_bytes,
            "columns": columns_by_table.get(table_name, []),
        })

    return metadata


def extract_all_metadata(dataset_ids: list[str] | None = None) -> list[dict]:
    """Extract metadata for all tables across specified datasets.

    Args:
        dataset_ids: List of dataset IDs. If None, extracts from all datasets.

    Returns:
        Flat list of table metadata dicts.
    """
    client = get_client()

    if dataset_ids is None:
        dataset_ids = [ds.dataset_id for ds in client.list_datasets()]

    all_metadata = []
    for i, dataset_id in enumerate(dataset_ids):
        print(f"  [{i+1}/{len(dataset_ids)}] Extracting {dataset_id}...")
        try:
            tables = extract_dataset_metadata(dataset_id)
            all_metadata.extend(tables)
            print(f"    -> {len(tables)} tables")
        except Exception as e:
            print(f"    -> ERROR: {e}")

    print(f"\nTotal: {len(all_metadata)} tables from {len(dataset_ids)} datasets")
    return all_metadata
