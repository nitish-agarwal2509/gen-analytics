import { useCallback, useRef, useEffect, type Dispatch, type SetStateAction } from 'react'
import { Box } from '@mui/material'
import useQueryStream, { createSession } from '../../hooks/useQueryStream'
import config from '../../config'
import type { ChatMessage } from '../../types'
import type { ToastSeverity } from '../../hooks/useToast'
import ChatInput from '../chat/ChatInput'
import MessageBubble from '../chat/MessageBubble'
import WelcomeScreen from '../chat/WelcomeScreen'

interface ChatViewProps {
  messages: ChatMessage[]
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>
  sessionId: string | null
  setSessionId: Dispatch<SetStateAction<string | null>>
  darkMode: boolean
  pendingQuery: string | null
  onPendingQueryConsumed: () => void
  onSaveQuery: (data: { name: string; question: string; sql: string }) => Promise<unknown>
  showToast: (message: string, severity?: ToastSeverity) => void
}

export default function ChatView({
  messages,
  setMessages,
  sessionId,
  setSessionId,
  darkMode,
  pendingQuery,
  onPendingQueryConsumed,
  onSaveQuery,
  showToast,
}: ChatViewProps) {
  const { state, sendMessage, cancel } = useQueryStream()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Eagerly create session on mount so first query is fast
  useEffect(() => {
    if (!sessionId) {
      createSession(config.app.agentName, config.app.defaultUserId).then(setSessionId)
    }
  }, [sessionId, setSessionId])

  // Auto-scroll on new content
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, state.text, state.thinkingSteps])

  const handleSend = useCallback(
    async (text: string) => {
      // Session should already exist from eager creation; fallback just in case
      let sid = sessionId
      if (!sid) {
        sid = await createSession(config.app.agentName, config.app.defaultUserId)
        setSessionId(sid)
      }

      // Add user message
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, userMsg])

      // Stream agent response
      try {
        const result = await sendMessage(sid, text)
        if (!result) return // cancelled

        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: result.text,
          timestamp: new Date(),
          sql: result.sql,
          results: result.results,
          validations: result.validations,
          vizConfig: result.vizConfig,
          thinkingSteps: result.thinkingSteps,
          elapsedSeconds: result.elapsedSeconds,
        }
        setMessages(prev => [...prev, assistantMsg])
      } catch (err) {
        const errText = (err as Error).message
        if (errText.includes('RESOURCE_EXHAUSTED') || errText.includes('429')) {
          showToast('Rate limit reached. Please wait a minute and try again.', 'warning')
        } else {
          showToast(`Error: ${errText}`, 'error')
        }
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Something went wrong: ${errText}`,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, errorMsg])
      }
    },
    [sessionId, setSessionId, setMessages, sendMessage, showToast],
  )

  // Handle pending query from saved queries drawer
  useEffect(() => {
    if (pendingQuery) {
      onPendingQueryConsumed()
      handleSend(pendingQuery)
    }
  }, [pendingQuery, onPendingQueryConsumed, handleSend])

  const handleSaveQuery = useCallback(
    async (question: string, sqlText: string) => {
      try {
        const name = question.length > 50 ? question.slice(0, 50) + '...' : question
        await onSaveQuery({ name, question, sql: sqlText })
        showToast('Query saved', 'success')
      } catch {
        showToast('Failed to save query', 'error')
      }
    },
    [onSaveQuery, showToast],
  )

  return (
    <>
      {/* Message area */}
      <Box
        ref={scrollRef}
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          py: 2,
        }}
      >
        {messages.length === 0 && !state.isStreaming ? (
          <WelcomeScreen onSelectQuery={handleSend} />
        ) : (
          <>
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                darkMode={darkMode}
                onSaveQuery={
                  msg.role === 'assistant' && msg.sql?.length
                    ? () => handleSaveQuery(
                        messages.find(m => m.role === 'user' && m.timestamp < msg.timestamp)?.content || 'Saved query',
                        msg.sql![msg.sql!.length - 1],
                      )
                    : undefined
                }
              />
            ))}

            {/* Streaming message (in-progress) */}
            {state.isStreaming && (
              <MessageBubble
                message={{
                  id: 'streaming',
                  role: 'assistant',
                  content: state.text,
                  timestamp: new Date(),
                  thinkingSteps: state.thinkingSteps,
                  sql: state.sql,
                  results: state.results,
                  validations: state.validations,
                  vizConfig: state.vizConfig,
                }}
                isStreaming
                darkMode={darkMode}
              />
            )}
          </>
        )}

      </Box>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onCancel={cancel}
        isStreaming={state.isStreaming}
      />
    </>
  )
}
