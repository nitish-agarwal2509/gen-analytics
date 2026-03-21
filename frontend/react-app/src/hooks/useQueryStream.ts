import { useCallback, useReducer, useRef } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import type {
  Message,
  QueryState,
  ThinkingStep,
  ValidationResult,
  QueryResults,
  VizConfig,
} from "@/types/api";

// ---- Config ----

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const APP_NAME = "gen_analytics";
const USER_ID = "web_user";

// ---- Reducer ----

type Action =
  | { type: "SUBMIT_START" }
  | { type: "STREAMING" }
  | { type: "STATUS"; step: ThinkingStep }
  | { type: "SQL"; sql: string; validation: ValidationResult }
  | { type: "RESULTS"; results: QueryResults }
  | { type: "VISUALIZATION"; viz: VizConfig }
  | { type: "EXPLANATION"; text: string }
  | { type: "DONE"; elapsedSeconds: number; toolCalls: string[] }
  | { type: "ERROR"; message: string }
  | { type: "RESET" };

const initialState: QueryState = {
  status: "idle",
  queryId: null,
  steps: [],
  sql: null,
  validation: null,
  results: null,
  visualization: null,
  explanation: null,
  error: null,
  elapsedSeconds: null,
  toolCalls: [],
};

function reducer(state: QueryState, action: Action): QueryState {
  switch (action.type) {
    case "SUBMIT_START":
      return { ...initialState, status: "submitting" };
    case "STREAMING":
      return { ...state, status: "streaming" };
    case "STATUS":
      return { ...state, steps: [...state.steps, action.step] };
    case "SQL":
      return { ...state, sql: action.sql, validation: action.validation };
    case "RESULTS":
      return { ...state, results: action.results };
    case "VISUALIZATION":
      return { ...state, visualization: action.viz };
    case "EXPLANATION":
      return { ...state, explanation: action.text };
    case "DONE":
      return {
        ...state,
        status: "done",
        elapsedSeconds: action.elapsedSeconds,
        toolCalls: action.toolCalls,
      };
    case "ERROR":
      return { ...state, status: "error", error: action.message };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

// ---- Tool labels ----

const TOOL_LABELS: Record<string, string> = {
  validate_sql: "Validating SQL...",
  execute_sql: "Executing query...",
  suggest_visualization: "Choosing visualization...",
  get_sample_data: "Inspecting table data...",
};

// ---- Hook ----

const SESSION_KEY = "ga_session_id";

export function useQueryStream() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const abortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string | null>(
    localStorage.getItem(SESSION_KEY),
  );

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const createSession = useCallback(async (signal: AbortSignal): Promise<string> => {
    // Try to reuse existing session from localStorage
    if (sessionIdRef.current) {
      // Validate it still exists on the server
      const check = await fetch(
        `${BACKEND}/apps/${APP_NAME}/users/${USER_ID}/sessions/${sessionIdRef.current}`,
        { signal },
      );
      if (check.ok) return sessionIdRef.current;
      // Session expired/deleted — create new one
      sessionIdRef.current = null;
      localStorage.removeItem(SESSION_KEY);
    }

    const res = await fetch(
      `${BACKEND}/apps/${APP_NAME}/users/${USER_ID}/sessions`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", signal },
    );
    if (!res.ok) throw new Error("Failed to create session");
    const { id } = await res.json();
    sessionIdRef.current = id;
    localStorage.setItem(SESSION_KEY, id);
    return id;
  }, []);

  const submitQuery = useCallback(
    async (question: string) => {
      cancelStream();
      dispatch({ type: "SUBMIT_START" });

      const abort = new AbortController();
      abortRef.current = abort;

      const sqlQueries: string[] = [];
      const toolCalls: string[] = [];
      let stepCount = 0;
      let hasError = false;
      const t0 = Date.now();

      try {
        const sessionId = await createSession(abort.signal);
        dispatch({ type: "STREAMING" });

        await fetchEventSource(`${BACKEND}/run_sse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appName: APP_NAME,
            userId: USER_ID,
            sessionId,
            newMessage: { role: "user", parts: [{ text: question }] },
            streaming: false,
          }),
          signal: abort.signal,
          openWhenHidden: true, // Keep streaming when tab is hidden

          onmessage(msg) {
            if (!msg.data) return;

            let event;
            try {
              event = JSON.parse(msg.data);
            } catch {
              return;
            }

            // ADK error
            if (event.error) {
              hasError = true;
              dispatch({ type: "ERROR", message: String(event.error) });
              return;
            }

            const parts = event.content?.parts;
            if (!parts) return;

            for (const part of parts) {
              // --- Function call ---
              if (part.functionCall) {
                const name: string = part.functionCall.name;
                const args = part.functionCall.args ?? {};
                toolCalls.push(name);
                stepCount++;
                dispatch({
                  type: "STATUS",
                  step: { step: stepCount, label: TOOL_LABELS[name] ?? `Calling ${name}...` },
                });

                if (name === "validate_sql" && args.sql) {
                  sqlQueries.push(args.sql);
                } else if (name === "execute_sql" && args.sql) {
                  if (!sqlQueries.length || sqlQueries.at(-1) !== args.sql) {
                    sqlQueries.push(args.sql);
                  }
                }
              }

              // --- Function response ---
              if (part.functionResponse) {
                const { name, response: resp } = part.functionResponse;
                if (!resp || typeof resp !== "object") return;

                if (name === "validate_sql") {
                  dispatch({
                    type: "SQL",
                    sql: sqlQueries.at(-1) ?? "",
                    validation: resp as ValidationResult,
                  });
                } else if (name === "execute_sql") {
                  if ("error" in resp) {
                    stepCount++;
                    dispatch({
                      type: "STATUS",
                      step: {
                        step: stepCount,
                        label: "Execution failed, retrying...",
                        detail: String(resp.error),
                      },
                    });
                  } else {
                    dispatch({ type: "RESULTS", results: resp as QueryResults });
                  }
                } else if (name === "suggest_visualization") {
                  dispatch({ type: "VISUALIZATION", viz: resp as VizConfig });
                }
              }

              // --- Text ---
              if (part.text) {
                dispatch({ type: "EXPLANATION", text: part.text });
              }
            }
          },

          onclose() {
            if (hasError) return; // Error already dispatched
            const elapsed = Math.round((Date.now() - t0) / 100) / 10;
            dispatch({ type: "DONE", elapsedSeconds: elapsed, toolCalls });
          },

          onerror(err) {
            // Don't retry — throw to stop
            throw err;
          },
        });
      } catch (err) {
        if (abort.signal.aborted) return;
        dispatch({
          type: "ERROR",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        abortRef.current = null;
      }
    },
    [cancelStream, createSession],
  );

  const reset = useCallback(() => {
    cancelStream();
    dispatch({ type: "RESET" });
  }, [cancelStream]);

  const clearSession = useCallback(() => {
    sessionIdRef.current = null;
    localStorage.removeItem(SESSION_KEY);
  }, []);

  /** Load chat history from ADK session events on page refresh. */
  const loadSessionHistory = useCallback(async (): Promise<Message[]> => {
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) return [];

    try {
      const res = await fetch(
        `${BACKEND}/apps/${APP_NAME}/users/${USER_ID}/sessions/${sessionId}`,
      );
      if (!res.ok) {
        localStorage.removeItem(SESSION_KEY);
        sessionIdRef.current = null;
        return [];
      }

      const session = await res.json();
      const events: unknown[] = session.events ?? [];
      const messages: Message[] = [];

      // Track state per invocation to reconstruct assistant messages
      let currentQuestion = "";
      let sql: string | null = null;
      let validation: ValidationResult | null = null;
      let results: QueryResults | null = null;
      let viz: VizConfig | null = null;
      let explanation = "";
      let toolCalls: string[] = [];

      for (const evt of events) {
        const e = evt as Record<string, unknown>;
        const content = e.content as Record<string, unknown> | undefined;
        if (!content?.parts) continue;
        const parts = content.parts as Record<string, unknown>[];
        const role = content.role as string;

        for (const part of parts) {
          if (role === "user" && part.text) {
            // Flush previous assistant message if any
            if (currentQuestion && (explanation || results || sql)) {
              messages.push({
                id: crypto.randomUUID(),
                role: "assistant",
                content: explanation || "Query completed.",
                queryState: {
                  status: "done",
                  queryId: null,
                  steps: [],
                  sql,
                  validation,
                  results,
                  visualization: viz,
                  explanation,
                  error: null,
                  elapsedSeconds: null,
                  toolCalls,
                },
                timestamp: Date.now(),
              });
              sql = null; validation = null; results = null; viz = null;
              explanation = ""; toolCalls = [];
            }

            // Skip internal transfer messages
            const text = part.text as string;
            if (text && !text.startsWith("{")) {
              currentQuestion = text;
              messages.push({
                id: crypto.randomUUID(),
                role: "user",
                content: text,
                timestamp: Date.now(),
              });
            }
          }

          // Track tool calls and responses for state reconstruction
          if (part.functionCall) {
            const fc = part.functionCall as Record<string, unknown>;
            const name = fc.name as string;
            const args = fc.args as Record<string, unknown> | undefined;
            if (name && name !== "transfer_to_agent") {
              toolCalls.push(name);
            }
            if ((name === "validate_sql" || name === "execute_sql") && args?.sql) {
              sql = args.sql as string;
            }
          }

          if (part.functionResponse) {
            const fr = part.functionResponse as Record<string, unknown>;
            const name = fr.name as string;
            const resp = fr.response as Record<string, unknown> | undefined;
            if (!resp) continue;

            if (name === "validate_sql") {
              validation = resp as unknown as ValidationResult;
            } else if (name === "execute_sql" && !("error" in resp)) {
              results = resp as unknown as QueryResults;
            } else if (name === "suggest_visualization") {
              viz = resp as unknown as VizConfig;
            }
          }

          // Capture final text from the orchestrator
          if (role === "model" && part.text) {
            const author = (e as Record<string, unknown>).author as string | undefined;
            if (author === "gen_analytics") {
              explanation = part.text as string;
            }
          }
        }
      }

      // Flush last assistant message
      if (currentQuestion && (explanation || results || sql)) {
        messages.push({
          id: crypto.randomUUID(),
          role: "assistant",
          content: explanation || "Query completed.",
          queryState: {
            status: "done",
            queryId: null,
            steps: [],
            sql,
            validation,
            results,
            visualization: viz,
            explanation,
            error: null,
            elapsedSeconds: null,
            toolCalls,
          },
          timestamp: Date.now(),
        });
      }

      return messages;
    } catch {
      return [];
    }
  }, []);

  return { state, submitQuery, reset, clearSession, loadSessionHistory } as const;
}
