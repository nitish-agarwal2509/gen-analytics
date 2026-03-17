"""Test BigQuery connection - lists all datasets and their tables."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv

load_dotenv()

from app.bigquery.client import list_datasets, list_tables

print("Connecting to BigQuery...")
print(f"Project: {os.getenv('GCP_PROJECT_ID')}")
print()

datasets = list_datasets()
print(f"Found {len(datasets)} datasets:")
for ds in datasets:
    tables = list_tables(ds)
    print(f"  {ds} ({len(tables)} tables)")
    for t in tables[:10]:
        print(f"    - {t}")
    if len(tables) > 10:
        print(f"    ... and {len(tables) - 10} more")
