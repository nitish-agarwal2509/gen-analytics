# Phase 7: React Frontend (Weeks 9-10)

**Milestone**: Production-quality chat UI with SSE streaming, rich charts, saved queries

**Learning Focus**: SSE streaming, React SPA patterns, frontend-backend API contract, MUI theming

**Key Design Decision**: Vite + React + MUI + Emotion. Not Next.js — GenAnalytics is a single-page analytics app (like Metabase, Superset, Redash), not a content site. SSR/file-based routing provide no value. Vite gives faster dev, simpler build, and the same stack used by every major BI tool. MUI provides a complete component system (UI + styling + icons) for fast development. Same stack as SM Saarthi for consistency. Future Metabase-like features (dashboards, drag-drop, saved queries) work perfectly in a Vite SPA with react-router.

**UX Reference**: SM Saarthi (`/Users/nitish.agarwal5/claude-project/sm/sm-saarthi/frontend/`). Take inspiration from:
- **Layout**: Full-screen chat with sticky header + scrollable messages + sticky input
- **Theme system**: Centralized `styles/theme.ts` with `ThemeColors` interface, light/dark tokens
- **Component styles**: Extracted to `styles/components.ts` as reusable `getSomethingStyles()` functions
- **Message bubbles**: Polymorphic component (user/assistant/tool variants), right/left aligned
- **Welcome screen**: Centered greeting with suggestion chips for quick-start queries
- **Dark mode**: System preference detection + toggle + localStorage persistence
- **SSE streaming**: fetch + ReadableStream + TextDecoder pattern with AbortController
- **Chat input**: Multiline TextField with Enter to send, Shift+Enter for newline
- **Header**: Compact with session info, action buttons (new session, share, clear, dark mode toggle)
- **Animations**: Fade-in on messages, custom scrollbar styling

**Tech Stack**:
- **Vite** — build tool + dev server
- **React 18 + TypeScript** — UI framework (strict mode)
- **MUI (Material-UI) 5** — component library (TextField, DataGrid, Dialog, etc.)
- **Emotion** — CSS-in-JS styling (MUI's built-in styling engine)
- **MUI Icons** — icon library
- **react-router** — client-side routing (`/`, `/dashboards`, `/queries` in future)
- **react-markdown + remark-gfm** — markdown rendering for agent responses
- **@codemirror/lang-sql** — SQL syntax highlighting
- **Recharts** — charts for query results
- **Mermaid** — diagram rendering (optional, for schema visualization)

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
2. Install dependencies:
   - `@mui/material @mui/icons-material @emotion/react @emotion/styled`
   - `react-router-dom`
   - `react-markdown remark-gfm`
   - `@codemirror/lang-sql @codemirror/view`
   - `recharts`
3. Set up project structure:
   ```
   frontend/web/
   ├── src/
   │   ├── components/
   │   │   ├── chat/            # ChatInput, MessageBubble, ThinkingSteps
   │   │   ├── results/         # SqlViewer, ResultTable, ChartRenderer, MetricCard
   │   │   └── layout/          # Header, Sidebar, WelcomeScreen
   │   ├── hooks/
   │   │   └── useQueryStream.ts
   │   ├── styles/
   │   │   ├── theme.ts         # MUI createTheme() + color tokens
   │   │   └── components.ts    # Reusable sx style functions
   │   ├── types/
   │   │   └── index.ts         # TypeScript interfaces
   │   ├── config.ts            # API base URL, app settings
   │   ├── App.tsx
   │   ├── App.css
   │   └── main.tsx
   ├── vite.config.ts
   └── package.json
   ```
4. Configure Vite proxy to FastAPI backend (port 8000)
5. Set up MUI ThemeProvider with light/dark themes

**Test**: Vite dev server runs, shows placeholder UI with MUI components

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

**Goal**: Build the core chat UI components using MUI.

**Steps**:
1. `ChatInput.tsx` — MUI TextField (multiline, max 4 rows) + InputAdornment send button, Enter to send, Shift+Enter for newline
2. `MessageBubble.tsx` — polymorphic: user (right-aligned) / assistant (left-aligned with react-markdown)
3. `ThinkingSteps.tsx` — animated progress indicator for agent tool calls
4. `WelcomeScreen.tsx` — centered greeting with suggestion chips (MUI Chip, clickable demo queries)

**Test**: Chat flow works with mock data

---

## Chunk 7.5: Results Components

**Goal**: Rich display of query results.

**Steps**:
1. `SqlViewer.tsx` — CodeMirror with SQL syntax highlighting, collapsible via MUI Collapse/Accordion
2. `ResultTable.tsx` — MUI Table or DataGrid with sortable columns, pagination
3. `ChartRenderer.tsx` — Recharts bar/line/area based on viz config from `suggest_visualization`
4. `MetricCard.tsx` — MUI Card with large Typography number + label for scalar results

**Test**: Each component renders correctly with sample data

---

## Chunk 7.6: Saved Queries

**Goal**: Users can save and reuse queries.

**Steps**:
1. Add `POST /api/v1/queries/saved` and `GET /api/v1/queries/saved` endpoints
2. Store in SQLite: name, description, original question, SQL, created_at
3. Frontend: "Save this query" button on each result, saved queries list in MUI Drawer sidebar

**Test**: Save a query -> appears in sidebar -> clicking re-runs it

---

## Chunk 7.7: Design & Polish

**Goal**: Production-quality UI.

**Steps**:
1. MUI theme: `createTheme()` with custom color palette, typography (Inter for UI, JetBrains Mono for code)
2. Dark mode: system preference detection + toggle button, persisted to localStorage
3. Loading states (MUI CircularProgress, Skeleton) and error boundaries
4. Keyboard shortcuts (Enter to submit, Ctrl+K to focus search)
5. Smooth animations (MUI transitions)
6. Polished empty states, onboarding hints
7. Mobile-responsive layout

**Test**: UI looks good on desktop and mobile, all interactions are smooth

---

## Definition of Done for Phase 7

- [ ] FastAPI streams responses via SSE
- [ ] Vite + React app consumes SSE stream with reactive state
- [ ] Chat UI with message history, thinking steps, SQL, charts
- [ ] SQL viewer with CodeMirror syntax highlighting
- [ ] Charts render via Recharts based on viz config
- [ ] Saved queries feature works
- [ ] Responsive design with dark mode (MUI + Emotion)
