/**
 * SSE streaming hook — consumes ADK /run_sse endpoint.
 * Uses fetch + ReadableStream + TextDecoder pattern with AbortController.
 */

import { useRef, useCallback, useState } from 'react'
import config from '../config'
import type {
  StreamState,
  ThinkingStep,
  ValidationResult,
  QueryResult,
  VizConfig,
  AdkEvent,
  AdkPart,
} from '../types'

const TOOL_LABELS: Record<string, string> = {
  validate_sql: 'Validating SQL...',
  execute_sql: 'Executing query...',
  suggest_visualization: 'Choosing visualization...',
  get_sample_data: 'Inspecting table data...',
}

const initialState: StreamState = {
  isStreaming: false,
  text: '',
  thinkingSteps: [],
  sql: [],
  results: [],
  validations: [],
  vizConfig: null,
  error: null,
}

/** Create a new ADK session. */
export async function createSession(
  appName: string,
  userId: string,
): Promise<string> {
  const res = await fetch(
    `${config.api.baseUrl}/apps/${appName}/users/${userId}/sessions`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
  )
  if (!res.ok) throw new Error(`Failed to create session: ${res.status}`)
  const data = await res.json()
  return data.id
}

export default function useQueryStream() {
  const [state, setState] = useState<StreamState>(initialState)
  const abortRef = useRef<AbortController | null>(null)

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setState(prev => ({ ...prev, isStreaming: false }))
  }, [])

  const sendMessage = useCallback(
    async (
      sessionId: string,
      message: string,
      appName = config.app.agentName,
      userId = config.app.defaultUserId,
    ) => {
      // Reset state for new query
      setState({ ...initialState, isStreaming: true })
      abortRef.current = new AbortController()

      // Mutable accumulators (React state updates are async)
      let text = ''
      const thinkingSteps: ThinkingStep[] = []
      const sql: string[] = []
      const results: QueryResult[] = []
      const validations: ValidationResult[] = []
      let vizConfig: VizConfig | null = null
      let startTime = Date.now()

      try {
        const res = await fetch(`${config.api.baseUrl}${config.api.endpoints.runSSE}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify({
            app_name: appName,
            user_id: userId,
            session_id: sessionId,
            new_message: {
              role: 'user',
              parts: [{ text: message }],
            },
            streaming: true,
          }),
          signal: abortRef.current.signal,
        })

        if (!res.ok) {
          const errText = await res.text()
          throw new Error(`Server error ${res.status}: ${errText}`)
        }
        if (!res.body) throw new Error('No response body')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data:')) continue
            try {
              const event: AdkEvent = JSON.parse(line.slice(5).trim())
              if (!event.content?.parts) continue

              for (const part of event.content.parts) {
                processPart(
                  part,
                  event,
                  { text, thinkingSteps, sql, results, validations, vizConfig },
                  (updates) => {
                    if (updates.text !== undefined) text = updates.text
                    if (updates.vizConfig !== undefined) vizConfig = updates.vizConfig
                  },
                )
              }

              // Push reactive state
              setState({
                isStreaming: true,
                text,
                thinkingSteps: [...thinkingSteps],
                sql: [...sql],
                results: [...results],
                validations: [...validations],
                vizConfig,
                error: null,
              })
            } catch {
              // Skip unparseable lines
            }
          }
        }

        // Mark final thinking steps as done
        for (const step of thinkingSteps) {
          if (step.status === 'running') step.status = 'done'
        }

        const elapsed = (Date.now() - startTime) / 1000
        setState({
          isStreaming: false,
          text,
          thinkingSteps: [...thinkingSteps],
          sql: [...sql],
          results: [...results],
          validations: [...validations],
          vizConfig,
          error: null,
        })

        return { text, sql, results, validations, vizConfig, thinkingSteps, elapsedSeconds: elapsed }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setState(prev => ({ ...prev, isStreaming: false }))
          return null
        }
        const errorMsg = (err as Error).message
        setState(prev => ({ ...prev, isStreaming: false, error: errorMsg }))
        throw err
      }
    },
    [],
  )

  return { state, sendMessage, cancel }
}

// --- Internal helpers ---

interface Accumulators {
  text: string
  thinkingSteps: ThinkingStep[]
  sql: string[]
  results: QueryResult[]
  validations: ValidationResult[]
  vizConfig: VizConfig | null
}

function processPart(
  part: AdkPart,
  event: AdkEvent,
  acc: Accumulators,
  setAcc: (updates: Partial<Pick<Accumulators, 'text' | 'vizConfig'>>) => void,
) {
  // Text
  if ('text' in part && part.text) {
    if (event.partial) {
      setAcc({ text: acc.text + part.text })
    } else {
      setAcc({ text: part.text })
    }
  }

  // Function call (thinking step)
  if ('functionCall' in part && part.functionCall) {
    const { name, args } = part.functionCall
    // Mark previous running steps as done
    for (const step of acc.thinkingSteps) {
      if (step.status === 'running') step.status = 'done'
    }
    acc.thinkingSteps.push({
      tool: name,
      label: TOOL_LABELS[name] || `Calling ${name}...`,
      status: 'running',
      args: args as Record<string, unknown>,
    })
    // Capture SQL from validate_sql / execute_sql calls
    if ((name === 'validate_sql' || name === 'execute_sql') && args?.sql) {
      const sqlStr = args.sql as string
      if (!acc.sql.length || acc.sql[acc.sql.length - 1] !== sqlStr) {
        acc.sql.push(sqlStr)
      }
    }
  }

  // Function response
  if ('functionResponse' in part && part.functionResponse) {
    const { name, response } = part.functionResponse
    const resp = response as Record<string, unknown>

    // Update the matching thinking step
    const step = [...acc.thinkingSteps].reverse().find(s => s.tool === name)
    if (step) {
      step.status = 'done'
      step.result = resp
    }

    if (name === 'validate_sql') {
      acc.validations.push(resp as unknown as ValidationResult)
    } else if (name === 'execute_sql') {
      acc.results.push(resp as unknown as QueryResult)
    } else if (name === 'suggest_visualization') {
      setAcc({ vizConfig: resp as unknown as VizConfig })
    }
  }
}
