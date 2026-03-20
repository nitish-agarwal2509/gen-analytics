/** ADK SSE event types and app data models. */

// --- ADK Event Types ---

export interface AdkTextPart {
  text: string
}

export interface AdkFunctionCallPart {
  functionCall: {
    name: string
    args: Record<string, unknown>
  }
}

export interface AdkFunctionResponsePart {
  functionResponse: {
    name: string
    response: Record<string, unknown>
  }
}

export type AdkPart = AdkTextPart | AdkFunctionCallPart | AdkFunctionResponsePart

export interface AdkEvent {
  content?: {
    parts?: AdkPart[]
    role?: string
  }
  partial?: boolean
  actions?: {
    stateDelta?: Record<string, unknown>
  }
  invocationId?: string
  author?: string
  longRunningToolIds?: string[]
  errorCode?: string
  errorMessage?: string
}

// --- App Data Models ---

export interface ThinkingStep {
  tool: string
  label: string
  status: 'running' | 'done' | 'error'
  args?: Record<string, unknown>
  result?: Record<string, unknown>
}

export interface ValidationResult {
  is_valid: boolean
  errors?: string[]
  estimated_bytes?: number
  estimated_cost_usd?: number
  tables_referenced?: string[]
  requires_approval?: boolean
}

export interface QueryResult {
  columns?: string[]
  rows?: Record<string, unknown>[]
  total_rows?: number
  bytes_processed?: number
  execution_time_ms?: number
  error?: string
}

export interface VizConfig {
  chart_type: 'bar' | 'bar_chart' | 'line' | 'line_chart' | 'area' | 'metric_card' | 'table'
  x_axis?: string
  y_axis?: string
  title?: string
  group_by?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  // Assistant-specific fields
  sql?: string[]
  results?: QueryResult[]
  validations?: ValidationResult[]
  vizConfig?: VizConfig | null
  thinkingSteps?: ThinkingStep[]
  elapsedSeconds?: number
}

export interface Session {
  id: string
  appName: string
  userId: string
}

export interface StreamState {
  isStreaming: boolean
  text: string
  thinkingSteps: ThinkingStep[]
  sql: string[]
  results: QueryResult[]
  validations: ValidationResult[]
  vizConfig: VizConfig | null
  error: string | null
}

export interface AppConfig {
  API_BASE_URL: string
}
