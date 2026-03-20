# Phase 7: React Frontend (Weeks 9-10)

**Milestone**: Production-quality chat UI with ADK SSE streaming, premium design, rich charts, saved queries

**Learning Focus**: ADK SSE, React patterns, Vite + shadcn/ui, Playwright e2e testing

---

## What Shipped

### Backend: ADK SSE Server

- **Replaced custom SSE with ADK built-in** — `get_fast_api_app()` from `google.adk.cli.fast_api` handles `/run_sse`, session management, and streaming natively
- **ADK agent wrapper** — `backend/agents/gen_analytics/agent.py` exports `root_agent` for ADK discovery
- **Saved queries API** — `backend/app/api/routes/saved_queries.py` (SQLite CRUD: create, list, delete)
- *Note: Initially built custom SSE endpoints with keepalives and queue-based streaming. Replaced with ADK SSE after discovering connection buffering issues with Vite proxy. ADK SSE solved all streaming reliability issues.*

### Frontend: Vite + React + TypeScript

**Stack:** Vite + React 18 + TypeScript + shadcn/ui + Tailwind CSS v4

**Key dependency:** `@microsoft/fetch-event-source` for POST SSE streaming (native `fetch` ReadableStream buffers responses; `EventSource` only supports GET)

**Components built:**
- `useQueryStream` hook — consumes ADK SSE events via `fetchEventSource`, parses `functionCall`, `functionResponse`, and `text` parts from ADK event format
- `useTheme` — dark mode toggle with localStorage persistence
- `useSavedQueries` — TanStack Query hooks for saved queries CRUD
- `ChatPage` — main page with example question pills, message history, streaming state
- `ChatInput` — textarea with Enter to submit, Ctrl/Cmd+K focus shortcut
- `ChatMessage` — user bubbles + assistant responses (thinking steps → SQL → chart → table → explanation)
- `ThinkingSteps` — animated step indicators (spinner/checkmark)
- `SqlViewer` — collapsible SQL display with validation badge, copy button (collapsed by default)
- `ResultTable` — TanStack Table with sorting, pagination, number formatting
- `ChartRenderer` → `BarChart`, `LineChart`, `MetricCard` — Recharts-based
- `SaveQueryButton` + `SavedQueryList` — save/reuse queries from sidebar
- `ErrorBoundary` — catches React render errors, shows "Something went wrong" instead of blank page
- `AppLayout`, `Sidebar`, `Header` — layout shell with dark mode toggle

**Markdown support:** `react-markdown` + `remark-gfm` for agent explanations (renders tables, bold, lists)

### E2E Tests: Playwright

- 8 mock tests (ADK SSE format): landing, dark mode, metric card, bar chart, error state, markdown table, SQL collapsed, scrolling
- 1 real backend integration test: submits query, verifies streaming steps + completion

---

## Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Vite + React over Next.js | SPA, no SSR needed | Single-page chat app, simpler than Next.js |
| shadcn/ui + Tailwind | Over MUI/Ant Design | Copy-paste components, no lock-in, premium look |
| ADK SSE over custom SSE | `get_fast_api_app()` | Native streaming, no keepalive/timeout/connection issues |
| `@microsoft/fetch-event-source` | Over native `fetch`/`EventSource` | Supports POST SSE with true streaming (no buffering) |
| Recharts over Plotly | React-native, 25x smaller | Only need bar, line, metric — Plotly is overkill |
| Direct backend URL for SSE | Not via Vite proxy | Vite's http-proxy buffers SSE responses |
| `useReducer` over `useState` | For streaming state | Rapid SSE events need centralized state transitions |

---

## Definition of Done for Phase 7

- [x] ADK SSE streams agent responses to React frontend
- [x] Chat UI with message history, thinking steps, SQL, charts
- [x] SQL viewer with validation badge, collapsible, copy button
- [x] Charts render based on viz config (bar, line, metric card)
- [x] Saved queries feature (save, list, delete, re-run from sidebar)
- [x] Premium design with dark mode, responsive layout
- [x] Markdown rendering in agent explanations (tables, bold, lists)
- [x] Error boundary prevents blank page on React errors
- [x] Keyboard shortcuts (Ctrl/Cmd+K, Enter to submit)
- [x] Playwright e2e tests (8 mock + 1 real, all passing)
