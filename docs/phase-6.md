# Phase 6: RAG Supplement & Evaluation (Weeks 7-8)

**Milestone**: 70%+ success rate on 30+ test questions, RAG supplements full schema with business context

**Learning Focus**: RAG as supplement layer, evaluation-driven development, business glossary, few-shot examples

**Key principle**: Full terse schema stays in the system prompt for table discovery. RAG adds business context, glossary, and examples on top -- it does NOT replace the schema.

---

## Chunk 6.1: ChromaDB Setup + Embeddings

**Goal**: Set up ChromaDB and embedding infrastructure for supplementary RAG.

**Steps**:
1. Install `chromadb` and add to dependencies
2. Write `backend/app/rag/embeddings.py`:
   - Use `gemini-embedding-001` via Google AI Studio API
   - Function `embed_text(text: str) -> list[float]`
3. Write `backend/app/rag/collections.py`:
   - Initialize ChromaDB client (persistent, local directory)
   - Create collections: `business_glossary`, `query_examples`
   - Helper functions for upsert and query

**Test**: ChromaDB initializes, collections created, can embed and store a test document

---

## Chunk 6.2: Metadata Enrichment

**Goal**: Add business context to raw metadata for better agent understanding.

**Steps**:
1. Create `data/metadata/table_enrichments.yaml`:
   ```yaml
   orders:
     description: "Customer orders with line items"
     business_context: "Primary table for revenue reporting"
     common_queries: ["total revenue", "average order value", "order volume"]
     tags: ["revenue", "sales", "transactions"]
   ```
2. Start with 20-30 most important tables
3. Merge enrichments into terse schema (append business context to table line)
4. Re-generate terse schema with enrichments

**Test**: Enriched tables have richer descriptions in the schema, improving agent table selection

---

## Chunk 6.3: Business Glossary

**Goal**: Map business terms to SQL patterns.

**Steps**:
1. Create `data/glossary/business_terms.yaml`:
   ```yaml
   churn:
     definition: "Customer who cancelled their subscription"
     sql_pattern: "WHERE status = 'cancelled' AND cancel_date IS NOT NULL"
     related_tables: ["subscriptions", "subscription_events"]
     synonyms: ["attrition", "cancellation"]

   MRR:
     definition: "Monthly Recurring Revenue"
     sql_pattern: "SUM(monthly_amount) FROM subscriptions WHERE status = 'active'"
     related_tables: ["subscriptions", "plans"]
   ```
2. Write `backend/scripts/seed_glossary.py` to embed and store in ChromaDB `business_glossary` collection
3. At query time, search glossary for matching terms and include context in agent prompt

**Test**: "What's our churn rate?" triggers glossary match and includes subscription tables + SQL pattern in context

---

## Chunk 6.4: Curated Query Examples

**Goal**: Provide few-shot examples for SQL generation.

**Steps**:
1. Create `data/examples/query_examples.yaml`:
   ```yaml
   - question: "Total revenue last month"
     sql: "SELECT SUM(order_total) FROM `project.dataset.orders` WHERE ..."
     tables: ["orders"]
     complexity: "LOW"
   - question: "Monthly active users trend"
     sql: "SELECT DATE_TRUNC(event_date, MONTH), COUNT(DISTINCT user_id) ..."
     tables: ["events"]
     complexity: "MEDIUM"
   ```
2. Curate 15-20 examples covering different complexity levels
3. Write `backend/scripts/seed_examples.py` to embed and store in ChromaDB `query_examples` collection
4. At query time, retrieve top 2-3 similar examples and include as few-shot in prompt

**Test**: Queries similar to examples get higher first-attempt accuracy

---

## Chunk 6.5: RAG Integration into Agent

**Goal**: Agent prompt is augmented with glossary matches and similar examples.

**Steps**:
1. Write `backend/app/rag/retriever.py`:
   ```python
   def get_supplementary_context(question: str) -> dict:
       # 1. Search business_glossary for matching terms
       # 2. Search query_examples for similar questions
       # 3. Return {glossary_matches: [...], similar_examples: [...]}
   ```
2. Update agent prompt builder to append supplementary context after the terse schema
3. Agent now has: full schema + glossary context + few-shot examples

**Test**: Agent produces better SQL for domain-specific queries (e.g., "churn rate") with glossary context

---

## Chunk 6.6: Evaluation Harness

**Goal**: Systematically measure and track accuracy.

**Steps**:
1. Write `backend/scripts/evaluate.py`:
   - Load test cases from YAML files
   - For each test case:
     - Run the agent
     - Check: Were the right tables selected? Did SQL validate? Did it execute? Are results reasonable?
   - Output: accuracy metrics per category
2. Create test case files:
   - `tests/eval/simple_queries.yaml` (15+ cases)
   - `tests/eval/medium_queries.yaml` (10+ cases)
   - `tests/eval/complex_queries.yaml` (5+ cases)
3. Track metrics over time (log to file)

**Test**: Evaluation runs and reports metrics. Target: 70%+ end-to-end success

---

## Definition of Done for Phase 6

- [ ] ChromaDB set up with business_glossary and query_examples collections
- [ ] 20-30 tables have enriched metadata
- [ ] Business glossary with 15-20 terms
- [ ] 15-20 curated query examples as few-shot
- [ ] RAG supplements agent context (glossary + examples alongside full schema)
- [ ] Evaluation harness with 30+ test cases
- [ ] 70%+ end-to-end success rate on test suite
