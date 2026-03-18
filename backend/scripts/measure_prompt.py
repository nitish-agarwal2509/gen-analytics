"""Measure system prompt token breakdown by section."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.agent.context_loader import load_full_context
from app.agent.prompts import build_system_prompt
from app.schema.formatter import estimate_tokens


def main():
    context = load_full_context()
    prompt = build_system_prompt(
        terse_schema=context["schema"],
        glossary=context["glossary"],
        examples=context["examples"],
    )

    print("=" * 60)
    print("System Prompt Token Breakdown")
    print("=" * 60)
    for section, tokens in context["token_counts"].items():
        if section != "total":
            print(f"  {section:20s}: {tokens:>6,} tokens")
    print(f"  {'prompt overhead':20s}: {estimate_tokens(prompt) - context['total_tokens']:>6,} tokens")
    print("-" * 60)
    print(f"  {'TOTAL PROMPT':20s}: {estimate_tokens(prompt):>6,} tokens")
    print(f"  {'Character count':20s}: {len(prompt):>6,} chars")
    print("=" * 60)

    if "--full" in sys.argv:
        print("\n--- FULL PROMPT ---\n")
        print(prompt)


if __name__ == "__main__":
    main()
