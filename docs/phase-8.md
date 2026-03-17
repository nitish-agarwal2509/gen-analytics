# Phase 8: Next.js Frontend (Weeks 11-12)

**Milestone**: Production-quality chat UI with SSE streaming, rich charts, saved queries

**Learning Focus**: SSE streaming, React patterns, frontend-backend API contract

---

## Chunk 8.1: FastAPI SSE Endpoints

**Goal**: Backend streams agent responses via Server-Sent Events.

**Steps**:
1. Write `backend/app/api/routes/query.py`:
   - `POST /api/v1/query` -> accepts question, returns `query_id`
   - `GET /api/v1/query/{id}/stream` -> SSE stream
2. SSE events:
   - `status`: thinking steps ("Searching tables...", "Generating SQL...")
   - `sql`: the generated SQL
   - `results`: query results as JSON
   - `visualization`: chart config
   - `explanation`: NL explanation
   - `done`: final metadata (execution time, cost, model used)
   - `error`: if something fails
3. Use FastAPI `StreamingResponse` with `text/event-stream` content type

**Test**: `curl` the SSE endpoint -> see events streaming in order

---

## Chunk 8.2: Next.js Project Setup

**Goal**: Scaffold the Next.js frontend.

**Steps**:
1. Create `frontend/nextjs_app/` with `npx create-next-app@latest`
2. Install dependencies: TanStack Query, Recharts or ECharts, CodeMirror (SQL viewer)
3. Set up basic layout: sidebar + main chat area
4. Configure proxy to FastAPI backend

**Test**: Next.js dev server runs, shows placeholder UI

---

## Chunk 8.3: SSE Client Hook

**Goal**: React hook that consumes the SSE stream.

**Steps**:
1. Write `frontend/nextjs_app/src/hooks/useQueryStream.ts`:
   ```typescript
   function useQueryStream(queryId: string) {
     // EventSource connection to /api/v1/query/{id}/stream
     // Parse events into state: {status, sql, results, visualization, error}
     // Return reactive state that updates as events arrive
   }
   ```
2. Handle reconnection, error states, cleanup

**Test**: Hook receives and parses all SSE event types correctly

---

## Chunk 8.4: Chat Components

**Goal**: Build the core chat UI components.

**Steps**:
1. `ChatInput.tsx` - Message input with submit button
2. `ChatMessage.tsx` - Message bubble supporting:
   - User message (plain text)
   - Assistant message (thinking steps + SQL + results + chart + explanation)
3. `ThinkingSteps.tsx` - Animated progress indicator for agent steps
4. `StreamingIndicator.tsx` - "Agent is thinking..." animation

**Test**: Chat flow works with mock data

---

## Chunk 8.5: Results Components

**Goal**: Rich display of query results.

**Steps**:
1. `SqlViewer.tsx` - CodeMirror with SQL syntax highlighting, collapsible
2. `ResultTable.tsx` - Sortable, paginated data table
3. `ChartRenderer.tsx` - Renders bar, line, metric card based on viz config
4. `MetricCard.tsx` - Single large number with label

**Test**: Each component renders correctly with sample data

---

## Chunk 8.6: Saved Queries (V1 feature)

**Goal**: Users can save and reuse queries.

**Steps**:
1. Add `POST /api/v1/queries/saved` and `GET /api/v1/queries/saved` endpoints
2. Store in SQLite: name, description, original question, SQL, created_at
3. Frontend: "Save this query" button on each result, saved queries list in sidebar

**Test**: Save a query -> appears in sidebar -> clicking re-runs it

---

## Chunk 8.7: Polish & Responsive Design

**Goal**: Production-quality UI.

**Steps**:
1. Mobile-responsive layout
2. Dark mode support
3. Loading states and error boundaries
4. Keyboard shortcuts (Enter to submit, Ctrl+K to focus search)
5. Smooth animations for thinking steps

**Test**: UI looks good on desktop and mobile, all interactions are smooth

---

## Definition of Done for Phase 8

- [ ] FastAPI streams responses via SSE
- [ ] Next.js consumes SSE stream with reactive state
- [ ] Chat UI with message history, thinking steps, SQL, charts
- [ ] SQL viewer with syntax highlighting
- [ ] Charts render based on viz config
- [ ] Saved queries feature works
- [ ] Responsive design, polished UX
