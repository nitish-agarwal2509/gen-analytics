# Phase 8: Multi-Turn Conversations (Week 11)

**Milestone**: Follow-up questions understand previous Q&A context

**Learning Focus**: Multi-turn context management, conversation memory, pronoun resolution

---

## Chunk 8.1: Conversation History Data Model

**Goal**: Define how conversation history is stored and structured.

**Steps**:
1. Write `backend/app/models/conversation.py`:
   ```python
   class ConversationTurn:
       role: str           # "user" or "assistant"
       content: str        # The message text
       sql: str | None     # Generated SQL (if assistant)
       results_summary: str | None  # Brief summary of results (if assistant)
       timestamp: datetime

   class Conversation:
       session_id: str
       turns: list[ConversationTurn]
   ```
2. Store via ADK session management (SQLite-backed, persisted across restarts)

**Test**: Create a Conversation, add turns, verify serialization

---

## Chunk 8.2: Context Window for Agent

**Goal**: Build conversation context into the agent prompt.

**Steps**:
1. Write `backend/app/agent/context.py`:
   - Function `build_conversation_context(conversation: Conversation, max_turns: int = 10) -> str`
   - Formats previous turns as:
     ```
     Previous conversation:
     User: "What are the top 10 customers by revenue?"
     Assistant: [SQL: SELECT ... ] [Result: 10 rows showing customer names and revenue]

     User: "Show their retention over time"
     ```
   - Truncate to last N turns to manage context window
   - Include results summary (not full data) to keep context manageable
2. Pass this context to the agent alongside the new question

**Test**: Build context from 5 turns -> verify it's well-formatted and under token limit

---

## Chunk 8.3: Results Summarization

**Goal**: Summarize query results for inclusion in conversation context.

**Steps**:
1. Write a summarizer function:
   ```python
   def summarize_results(columns, rows, sql) -> str:
       # "Returned 10 rows with columns: customer_name, total_revenue.
       #  Top result: Acme Corp ($1.2M). Results range from $50K to $1.2M."
   ```
2. Keep summaries concise (under 200 tokens) -- enough for the LLM to understand what was returned without including all data

**Test**: Summarize a 10-row result -> readable summary under 200 tokens

---

## Chunk 8.4: Multi-Turn Agent Integration

**Goal**: Agent receives and uses conversation context.

**Steps**:
1. Update agent to accept conversation history:
   - Prepend conversation context to the system prompt or user message
   - Agent can reference previous queries: "The user previously asked about X and got Y"
2. Update system prompt:
   ```
   You have access to the conversation history. When the user says "their", "that",
   "those", etc., refer to the previous context to understand what they mean.
   If the user says "break that down by X", modify the previous query to add GROUP BY X.
   ```

**Test**:
- Ask "Top 10 customers by revenue" -> get results
- Follow up "Show me just the enterprise ones" -> agent understands "them" = previous customers, adds filter
- Follow up "Now by quarter" -> agent adds time dimension to the previous query

---

## Chunk 8.5: Multi-Turn UI Integration

**Goal**: React chat UI maintains and displays conversation history.

**Steps**:
1. Update React frontend:
   - Maintain conversation state across messages
   - Each user message appends to conversation
   - Each agent response (with SQL and results summary) appends to conversation
   - Pass full conversation to agent on each new question
   - Display full chat history with expandable SQL for each response
2. Add "New Conversation" button to reset context

**Test**:
1. Ask a question -> see result
2. Ask a follow-up -> agent uses context from previous answer
3. Click "New Conversation" -> context is cleared

---

## Chunk 8.6: Context-Aware Self-Correction

**Goal**: Self-correction also benefits from conversation context.

**Steps**:
1. When self-correction triggers, include conversation history in the retry prompt
   - "The user has been asking about customer data. The previous query returned top customers. Now they're asking about retention. My SQL failed because..."
2. This helps the agent make better corrections when the follow-up question is ambiguous

**Test**: Ask a follow-up that causes an error -> self-correction uses conversation context to fix it correctly

---

## Definition of Done for Phase 8

- [ ] Conversation history stored with question + SQL + results summary per turn
- [ ] Agent receives conversation context with each new question
- [ ] Follow-up questions with pronouns ("their", "those") resolve correctly
- [ ] "Break that down by X" modifies the previous query appropriately
- [ ] Chat displays full conversation with expandable SQL
- [ ] "New Conversation" button resets context
- [ ] At least 3 out of 5 multi-turn test sequences complete correctly
