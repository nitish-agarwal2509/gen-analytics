"""Test Gemini API connection via Google GenAI."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv

load_dotenv()

from google import genai

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

# Test 1: Simple prompt
print("Test 1: Simple prompt")
response = client.models.generate_content(
    model="gemini-2.5-flash", contents="What is 2 + 2? Reply with just the number."
)
print(f"Response: {response.text}")
print("PASS\n")

# Test 2: SQL-related prompt
print("Test 2: SQL generation prompt")
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Write a BigQuery SQL query to count all rows in a table called `orders`. Reply with just the SQL.",
)
print(f"Response: {response.text}")
print("PASS\n")

print("Gemini API working!")
