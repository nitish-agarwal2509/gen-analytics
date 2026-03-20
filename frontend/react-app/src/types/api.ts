export interface ThinkingStep {
  step: number;
  label: string;
  detail?: string;
}

export interface ValidationResult {
  is_valid: boolean;
  errors: string[];
  estimated_bytes: number;
  estimated_cost_usd: number;
  requires_approval: boolean;
  approval_message?: string;
}

export interface QueryResults {
  columns: string[];
  rows: Record<string, unknown>[];
  total_rows: number;
  bytes_processed: number;
  error?: string;
}

export interface VizConfig {
  chart_type: "metric_card" | "bar_chart" | "line_chart" | "table";
  x_axis: string | null;
  y_axis: string | null;
  title: string;
  reasoning: string;
}

export type QueryStatus =
  | "idle"
  | "submitting"
  | "streaming"
  | "done"
  | "error";

export interface QueryState {
  status: QueryStatus;
  queryId: string | null;
  steps: ThinkingStep[];
  sql: string | null;
  validation: ValidationResult | null;
  results: QueryResults | null;
  visualization: VizConfig | null;
  explanation: string | null;
  error: string | null;
  elapsedSeconds: number | null;
  toolCalls: string[];
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  queryState?: QueryState;
  timestamp: number;
}

export interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  question: string;
  sql: string;
  viz_config?: VizConfig;
  created_at: string;
  updated_at: string;
}
