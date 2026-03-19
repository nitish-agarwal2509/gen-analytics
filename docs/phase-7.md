# Phase 7: React Frontend (Weeks 9-10)

**Milestone**: Production-quality chat UI with SSE streaming, rich charts, saved queries

**Learning Focus**: ADK SSE integration, React SPA patterns, frontend-backend API contract, MUI theming

**Key Design Decisions**:
1. **Vite + React + MUI + Emotion** (not Next.js) — GenAnalytics is a single-page analytics app (like Metabase, Superset, Redash), not a content site. SSR/file-based routing provide no value. Same stack as SM Saarthi.
2. **ADK built-in SSE** (not custom endpoints) — ADK provides `/run_sse`, session management, and event streaming out of the box. SM Saarthi uses this pattern. No need to build custom SSE infrastructure. Custom FastAPI routes from Streamlit MVP become unnecessary.

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

---

## Chunk 7.1: Switch Backend to ADK Built-in SSE

**Goal**: Replace custom FastAPI routes with ADK's built-in `/run_sse` endpoint, matching SM Saarthi's pattern.

**Steps**:
1. Update `backend/app/main.py`:
   - Switch from custom FastAPI app to `get_fast_api_app()` from `google.adk.cli.fast_api`
   - ADK auto-generates: `POST /run_sse`, session CRUD, `/list-apps`
   - Keep custom routes only where needed (health check, saved queries)
2. Restructure agent directory to match ADK's agent discovery:
   - `backend/agents/gen_analytics/` with `__init__.py` exporting `root_agent`
   - ADK scans `agents_dir` for agent modules
3. Configure ADK session storage (SQLite for dev, MySQL for production)
4. Add CORS middleware for frontend dev server
5. Verify existing tools (validate_sql, execute_sql, get_sample_data, suggest_visualization) work through `/run_sse`

**ADK provides these endpoints automatically**:
- `POST /run_sse` — streams agent responses as SSE events
- `GET/POST /apps/{agent}/users/{user}/sessions` — session CRUD
- `GET /list-apps` — agent discovery

**SSE Event Format** (ADK standard):
```json
// Text response (streamed)
{"content": {"parts": [{"text": "response text"}]}, "partial": true}

// Tool call (thinking step)
{"content": {"parts": [{"functionCall": {"name": "validate_sql", "args": {...}}}]}}

// Tool result
{"content": {"parts": [{"functionResponse": {"name": "validate_sql", "response": {...}}}]}}
```

**Test**: `curl -X POST /run_sse` with a test question -> see ADK events streaming

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

**Goal**: React hook that consumes ADK's `/run_sse` SSE stream (same pattern as SM Saarthi).

**Steps**:
1. Write `frontend/web/src/hooks/useQueryStream.ts`:
   ```typescript
   function useQueryStream() {
     // POST to /run_sse with {app_name, user_id, session_id, new_message, streaming: true}
     // fetch() with ReadableStream + TextDecoder
     // Parse ADK events: text (partial/complete), functionCall, functionResponse
     // Map functionCall events to thinking steps:
     //   validate_sql -> "Validating SQL..."
     //   execute_sql -> "Executing query..."
     //   suggest_visualization -> "Generating chart..."
     // Extract SQL, results, viz config from functionResponse events
     // AbortController for cancellation
     // Return reactive state
   }
   ```
2. Write session management helpers:
   - `createSession(appName, userId)` — POST to `/apps/{app}/users/{user}/sessions`
   - `loadSession(appName, userId, sessionId)` — GET session history
3. Handle reconnection, error states, cleanup

**Test**: Hook receives and parses all ADK event types correctly

---

## Chunk 7.4: Chat Components

**Goal**: Build the core chat UI components using MUI.

**Steps**:
1. `ChatInput.tsx` — MUI TextField (multiline, max 4 rows) + InputAdornment send button, Enter to send, Shift+Enter for newline
2. `MessageBubble.tsx` — polymorphic component:
   - User: right-aligned bubble, plain text
   - Assistant: left-aligned, react-markdown rendering
   - Tool: left-aligned, collapsible JSON display (expand/collapse for tool calls and results)
3. `ThinkingSteps.tsx` — maps ADK `functionCall` events to human-readable steps:
   - `validate_sql` → "Validating SQL..."
   - `execute_sql` → "Executing query..."
   - `get_sample_data` → "Sampling data..."
   - `suggest_visualization` → "Generating chart..."
4. `WelcomeScreen.tsx` — centered greeting with suggestion chips (MUI Chip, clickable demo queries)

**Test**: Chat flow works with mock data

---

## Chunk 7.5: Results Components

**Goal**: Rich display of query results (GenAnalytics-specific, not in SM Saarthi).

**Steps**:
1. `SqlViewer.tsx` — CodeMirror with SQL syntax highlighting, collapsible via MUI Collapse/Accordion
2. `ResultTable.tsx` — MUI Table or DataGrid with sortable columns, pagination
3. `ChartRenderer.tsx` — Recharts bar/line/area based on viz config from `suggest_visualization` tool response
4. `MetricCard.tsx` — MUI Card with large Typography number + label for scalar results

**Test**: Each component renders correctly with sample data

---

## Chunk 7.6: Saved Queries

**Goal**: Users can save and reuse queries.

**Steps**:
1. Add custom FastAPI endpoints (alongside ADK routes):
   - `POST /api/v1/queries/saved`
   - `GET /api/v1/queries/saved`
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

- [ ] Backend uses ADK built-in `/run_sse` for SSE streaming (not custom endpoints)
- [ ] ADK session management working (create, load, persist)
- [ ] Vite + React app consumes `/run_sse` stream with reactive state
- [ ] Chat UI with message history, thinking steps, SQL, charts
- [ ] SQL viewer with CodeMirror syntax highlighting
- [ ] Charts render via Recharts based on viz config
- [ ] Saved queries feature works
- [ ] Responsive design with dark mode (MUI + Emotion)
