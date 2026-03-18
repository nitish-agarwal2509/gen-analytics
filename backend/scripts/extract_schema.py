"""Extract metadata from BigQuery and save as JSON.

Usage:
    python scripts/extract_schema.py                    # All datasets
    python scripts/extract_schema.py ds1 ds2 ds3        # Specific datasets
"""

import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from app.bigquery.metadata import extract_all_metadata
from app.schema.formatter import format_terse_schema, estimate_tokens

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
METADATA_PATH = os.path.join(DATA_DIR, "schema_metadata.json")
TERSE_SCHEMA_PATH = os.path.join(DATA_DIR, "schema_cache.txt")


def main():
    dataset_ids = sys.argv[1:] if len(sys.argv) > 1 else None

    if dataset_ids:
        print(f"Extracting metadata for datasets: {', '.join(dataset_ids)}")
    else:
        print("Extracting metadata for ALL datasets...")

    metadata = extract_all_metadata(dataset_ids)

    # Ensure output directory exists
    os.makedirs(DATA_DIR, exist_ok=True)

    # Save raw metadata JSON
    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

    # Generate and save terse schema text
    terse_schema = format_terse_schema(metadata)
    with open(TERSE_SCHEMA_PATH, "w") as f:
        f.write(terse_schema)

    # Stats
    total_cols = sum(len(t["columns"]) for t in metadata)
    total_rows = sum(t["row_count"] for t in metadata)
    tokens = estimate_tokens(terse_schema)
    datasets = sorted(set(t["dataset"] for t in metadata))

    print(f"\n{'='*50}")
    print(f"Schema extraction complete")
    print(f"{'='*50}")
    print(f"Datasets:  {len(datasets)} ({', '.join(datasets)})")
    print(f"Tables:    {len(metadata)}")
    print(f"Columns:   {total_cols}")
    print(f"Total rows: {total_rows:,}")
    print(f"Terse schema: {len(terse_schema):,} chars (~{tokens:,} tokens)")
    print(f"\nSaved: {METADATA_PATH}")
    print(f"Saved: {TERSE_SCHEMA_PATH}")


if __name__ == "__main__":
    main()
