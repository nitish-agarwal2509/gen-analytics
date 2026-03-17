"""Test the execute_sql tool."""

import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv

load_dotenv()

from app.agent.tools.execute_sql import execute_sql

# Test 1: Simple SELECT
print("Test 1: SELECT 1 as test")
result = execute_sql("SELECT 1 as test")
print(json.dumps(result, indent=2))
assert "error" not in result, f"Unexpected error: {result}"
assert result["rows"][0]["test"] == 1
print("PASS\n")

# Test 2: DML rejection
print("Test 2: DROP TABLE rejection")
result = execute_sql("DROP TABLE foo")
print(json.dumps(result, indent=2))
assert "error" in result
assert "DML/DDL not allowed" in result["error"]
print("PASS\n")

# Test 3: Invalid SQL error handling
print("Test 3: Invalid SQL (nonexistent table)")
result = execute_sql("SELECT * FROM nonexistent_dataset.nonexistent_table")
print(json.dumps(result, indent=2))
assert "error" in result
print("PASS\n")

# Test 4: Query a real table (pick first available)
print("Test 4: Query a real table")
result = execute_sql("SELECT COUNT(*) as cnt FROM `sm-apps-core.users_prod.account` LIMIT 1")
print(json.dumps(result, indent=2))
if "error" not in result:
    print("PASS\n")
else:
    print(f"SKIP (table may not be accessible): {result['error']}\n")

print("All tests completed!")
