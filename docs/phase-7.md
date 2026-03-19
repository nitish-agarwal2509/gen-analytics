# Phase 7: React Frontend (Weeks 9-10)

**Milestone**: Production-quality chat UI with SSE streaming, premium design, rich charts, saved queries

**Learning Focus**: SSE streaming, React SPA patterns, frontend-backend API contract, production UI/UX

**Key Design Decision**: Vite + React + shadcn/ui + Tailwind. Not Next.js — GenAnalytics is a single-page analytics app (like Metabase, Superset, Redash), not a content site. SSR/file-based routing provide no value. Vite gives faster dev, simpler build, and the same stack used by every major BI tool. shadcn/ui + Tailwind give premium design with full customization (components are local files, not node_module black boxes). Future Metabase-like features (dashboards, drag-drop, saved queries) work perfectly in a Vite SPA with react-router.

**Tech Stack**:
- **Vite** — build tool + dev server
- **React 18 + TypeScript** — UI framework (strict mode)
- **shadcn/ui** — copy-paste UI primitives (button, card, table, dialog, sheet, dropdown)
- **Tailwind CSS** — utility-first styling, dark mode via `dark:` prefix
- **react-router** — client-side routing (`/`, `/dashboards`, `/queries` in future)
- **@codemirror/lang-sql** — SQL syntax highlighting
- **Recharts** — charts (lighter than Plotly, Tailwind-friendly)
- **lucide-react** — icons
- **tailwind-merge + clsx** — conditional class composition

---

## Chunk 7.1: FastAPI SSE Endpoints

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

## Chunk 7.2: Vite + React Project Setup

**Goal**: Scaffold the React frontend with Vite.

**Steps**:
1. Create `frontend/web/` with `npm create vite@latest -- --template react-ts`
2. Install and configure:
   - Tailwind CSS + postcss + autoprefixer
   - shadcn/ui (init + add components: button, card, input, table, dialog, sheet, dropdown-menu, scroll-area)
   - react-router-dom
   - @codemirror/lang-sql + @codemirror/view
   - recharts
   - lucide-react
3. Set up project structure:
   ```
   frontend/web/
   ├── src/
   │   ├── components/
   │   │   ├── ui/              # shadcn primitives
   │   │   ├── chat/            # ChatInput, MessageBubble, ThinkingSteps
   │   │   ├── results/         # SqlViewer, ResultTable, ChartRenderer, MetricCard
   │   │   └── layout/          # Header, Sidebar, WelcomeScreen
   │   ├── hooks/
   │   │   └── useQueryStream.ts
   │   ├── lib/
   │   │   ├── utils.ts         # cn() helper
   │   │   └── api.ts           # API client
   │   ├── styles/
   │   │   └── globals.css      # Tailwind + CSS variables for theming
   │   ├── App.tsx
   │   └── main.tsx
   ├── tailwind.config.ts
   ├── vite.config.ts
   └── package.json
   ```
4. Configure Vite proxy to FastAPI backend (port 8000)

**Test**: Vite dev server runs, shows placeholder UI

---

## Chunk 7.3: SSE Client Hook

**Goal**: React hook that consumes the SSE stream.

**Steps**:
1. Write `frontend/web/src/hooks/useQueryStream.ts`:
   ```typescript
   function useQueryStream(queryId: string) {
     // fetch() with ReadableStream + TextDecoder
     // Parse SSE events into state: {status, sql, results, visualization, error}
     // AbortController for cancellation
     // Return reactive state that updates as events arrive
   }
   ```
2. Handle reconnection, error states, cleanup

**Test**: Hook receives and parses all SSE event types correctly

---

## Chunk 7.4: Chat Components

**Goal**: Build the core chat UI components using shadcn/ui primitives.

**Steps**:
1. `ChatInput.tsx` — shadcn Input/Textarea + Button, Enter to send, Shift+Enter for newline
2. `MessageBubble.tsx` — polymorphic: user (right-aligned) / assistant (left-aligned with markdown)
3. `ThinkingSteps.tsx` — animated progress indicator for agent tool calls
4. `WelcomeScreen.tsx` — centered greeting with suggestion chips (clickable demo queries)

**Test**: Chat flow works with mock data

---

## Chunk 7.5: Results Components

**Goal**: Rich display of query results.

**Steps**:
1. `SqlViewer.tsx` — CodeMirror with SQL syntax highlighting, collapsible via shadcn Collapsible
2. `ResultTable.tsx` — shadcn Table with sortable columns, pagination
3. `ChartRenderer.tsx` — Recharts bar/line/area based on viz config from `suggest_visualization`
4. `MetricCard.tsx` — shadcn Card with large number + label for scalar results

**Test**: Each component renders correctly with sample data

---

## Chunk 7.6: Saved Queries

**Goal**: Users can save and reuse queries.

**Steps**:
1. Add `POST /api/v1/queries/saved` and `GET /api/v1/queries/saved` endpoints
2. Store in SQLite: name, description, original question, SQL, created_at
3. Frontend: "Save this query" button on each result, saved queries in sidebar (shadcn Sheet)

**Test**: Save a query -> appears in sidebar -> clicking re-runs it

---

## Chunk 7.7: Premium Design & Polish

**Goal**: Production-quality, premium UI.

**Steps**:
1. Tailwind theme: custom color palette, typography (Inter for UI, JetBrains Mono for code)
2. Dark mode: CSS variables + `dark:` classes, system preference detection + toggle
3. Loading states and error boundaries
4. Keyboard shortcuts (Enter to submit, Ctrl+K to focus search)
5. Smooth animations (Tailwind `transition` + `animate` utilities)
6. Polished empty states, onboarding hints
7. Mobile-responsive layout

**Test**: UI looks premium on desktop and mobile, all interactions are smooth

---

## Definition of Done for Phase 7

- [ ] FastAPI streams responses via SSE
- [ ] Vite + React app consumes SSE stream with reactive state
- [ ] Chat UI with message history, thinking steps, SQL, charts
- [ ] SQL viewer with CodeMirror syntax highlighting
- [ ] Charts render via Recharts based on viz config
- [ ] Saved queries feature works
- [ ] Premium, responsive design with dark mode (shadcn/ui + Tailwind)
