"""Test script for the GenAnalytics ADK agent."""

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


async def ask(runner: Runner, user_id: str, session_id: str, question: str):
    """Send a question to the agent and print the response."""
    print(f"\n{'='*60}")
    print(f"Q: {question}")
    print(f"{'='*60}")

    message = types.Content(
        role="user", parts=[types.Part(text=question)]
    )

    final_text = ""
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
                print(f"\n[Tool Call] {fc.name}()")
                if fc.args and "sql" in fc.args:
                    print(f"  SQL: {fc.args['sql']}")

            # Tool response
            if part.function_response:
                fr = part.function_response
                resp = fr.response
                if isinstance(resp, dict) and "error" in resp:
                    print(f"  [Error] {resp['error']}")
                elif isinstance(resp, dict) and "total_rows" in resp:
                    print(f"  [Result] {resp['total_rows']} total rows, {len(resp.get('rows', []))} returned")

            # Text response from the model
            if part.text:
                final_text = part.text

    print(f"\nA: {final_text}")


async def main():
    agent = create_agent()
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
        "How many total accounts are in the users_prod.account table?",
        "What are the top 5 banks by number of UPI accounts?",
        "What is the total cashback redeemed vs credited across all wallets?",
    ]

    for q in questions:
        await ask(runner, "test_user", session.id, q)


if __name__ == "__main__":
    asyncio.run(main())
