"""Test script for the GenAnalytics ADK agent.

Usage:
    python scripts/test_agent.py                  # Dry-run mode (validate only, $0 BQ cost)
    python scripts/test_agent.py --execute         # Full execution (scans real data)
    python scripts/test_agent.py --execute -n 3    # Execute only first 3 questions
"""

import argparse
import asyncio
import sys
import os

# Add backend to path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load .env so Vertex AI env vars are available to ADK
from dotenv import load_dotenv
load_dotenv()

from google.genai import types
from google.adk import Runner
from google.adk.sessions import InMemorySessionService

from app.agent.agent import create_agent


# In dry-run mode, execute_sql is replaced with a stub that returns
# a message instead of scanning real data. validate_sql still hits BQ
# dry-run API (which is free).
def _make_execute_sql_stub():
    """Return a stub execute_sql that doesn't scan data."""
    def execute_sql(sql: str, max_rows: int = 100) -> dict:
        """Stub: returns a message instead of running the query."""
        return {
            "columns": ["info"],
            "rows": [{"info": "[DRY-RUN] Query validated but not executed to save cost."}],
            "total_rows": 0,
            "bytes_processed": 0,
        }
    return execute_sql


async def ask(runner: Runner, user_id: str, session_id: str, question: str):
    """Send a question to the agent and print the response."""
    print(f"\n{'='*60}")
    print(f"Q: {question}")
    print(f"{'='*60}")

    message = types.Content(
        role="user", parts=[types.Part(text=question)]
    )

    tool_sequence = []
    final_text = ""
    total_bytes = 0

    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=message,
    ):
        if not event.content or not event.content.parts:
            continue

        for part in event.content.parts:
            # Tool call from the model
            if part.function_call:
                fc = part.function_call
                tool_sequence.append(fc.name)
                print(f"\n[Tool Call] {fc.name}()")
                if fc.args and "sql" in fc.args:
                    print(f"  SQL: {fc.args['sql']}")

            # Tool response
            if part.function_response:
                fr = part.function_response
                resp = fr.response
                if isinstance(resp, dict) and "is_valid" in resp:
                    if resp["is_valid"]:
                        est_mb = resp.get("estimated_bytes", 0) / 1024 ** 2
                        total_bytes += resp.get("estimated_bytes", 0)
                        print(f"  [Validated] ✅ scan: {est_mb:.1f} MB, cost: ${resp.get('estimated_cost_usd', 0):.6f}")
                    else:
                        print(f"  [Validated] ❌ {resp.get('errors', [])}")
                elif isinstance(resp, dict) and "error" in resp:
                    print(f"  [Error] {resp['error']}")
                elif isinstance(resp, dict) and "total_rows" in resp:
                    print(f"  [Result] {resp['total_rows']} total rows, {len(resp.get('rows', []))} returned")
                    total_bytes += resp.get("bytes_processed", 0)

            # Text response from the model
            if part.text:
                final_text = part.text

    print(f"\n  Tools: {' -> '.join(tool_sequence)}")
    print(f"A: {final_text[:200]}")
    return total_bytes


async def main():
    parser = argparse.ArgumentParser(description="Test the GenAnalytics agent")
    parser.add_argument("--execute", action="store_true", help="Execute queries (default: dry-run only)")
    parser.add_argument("-n", type=int, default=0, help="Number of questions to test (0 = all)")
    args = parser.parse_args()

    agent = create_agent()

    # In dry-run mode, swap execute_sql tool with a stub
    if not args.execute:
        from google.adk.tools import FunctionTool
        stub = _make_execute_sql_stub()
        agent.tools = [
            t if t.func.__name__ != "execute_sql" else FunctionTool(stub)
            for t in agent.tools
        ]
        print("🔒 DRY-RUN MODE: validate_sql runs (free), execute_sql stubbed")
    else:
        print("⚡ EXECUTE MODE: queries will scan real data")

    session_service = InMemorySessionService()
    runner = Runner(
        app_name="gen_analytics",
        agent=agent,
        session_service=session_service,
    )

    # Create a session
    session = await session_service.create_session(
        app_name="gen_analytics", user_id="test_user"
    )

    questions = [
        "How many unique users have a rewards wallet?",
        "What are the top 5 banks by number of UPI accounts?",
        "What is the total cashback redeemed vs credited across all wallets?",
        "How many UPI complaints were filed in the last 30 days by category?",
        "What are the top 3 payout partners by total payout amount?",
        "How many active vs blocked mandates are there?",
        "Show the total number of login entities by state",
        "What is the average redemption amount by redemption type?",
    ]

    if args.n > 0:
        questions = questions[:args.n]

    total_bytes = 0
    for q in questions:
        total_bytes += await ask(runner, "test_user", session.id, q)

    # Summary
    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    print(f"Questions tested: {len(questions)}")
    print(f"Total bytes scanned: {total_bytes / 1024**2:.1f} MB")
    print(f"Estimated BQ cost: ${total_bytes * 6.25 / 1e12:.6f}")
    mode = "EXECUTE" if args.execute else "DRY-RUN (free BQ)"
    print(f"Mode: {mode}")


if __name__ == "__main__":
    asyncio.run(main())
