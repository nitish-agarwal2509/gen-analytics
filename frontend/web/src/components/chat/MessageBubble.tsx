import { useState } from 'react'
import { Box, Paper, Typography, IconButton, Tooltip, CircularProgress } from '@mui/material'
import { Person, SmartToy, BookmarkAdd, Check } from '@mui/icons-material'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage } from '../../types'
import ThinkingSteps from './ThinkingSteps'
import SqlViewer from '../results/SqlViewer'
import ResultTable from '../results/ResultTable'
import ChartRenderer from '../results/ChartRenderer'
import MetricCard from '../results/MetricCard'
import ValidationBadge from '../results/ValidationBadge'

interface MessageBubbleProps {
  message: ChatMessage
  isStreaming?: boolean
  darkMode: boolean
  onSaveQuery?: () => void
}

export default function MessageBubble({ message, isStreaming, darkMode, onSaveQuery }: MessageBubbleProps) {
  const [saved, setSaved] = useState(false)
  const isUser = message.role === 'user'

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        maxWidth: 840,
        mx: 'auto',
        width: '100%',
        px: 2,
        animation: 'fadeInUp 0.2s ease-out',
      }}
    >
      {/* Avatar */}
      {!isUser && (
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            mt: 0.5,
          }}
        >
          <SmartToy sx={{ fontSize: 18, color: 'white' }} />
        </Box>
      )}

      {/* Content */}
      <Box sx={{ maxWidth: isUser ? '70%' : '85%' }}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: isUser ? 'primary.main' : 'background.paper',
            color: isUser ? 'white' : 'text.primary',
            border: isUser ? 'none' : 1,
            borderColor: 'divider',
          }}
        >
          {isUser ? (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {message.content}
            </Typography>
          ) : (
            <AssistantContent message={message} isStreaming={isStreaming} darkMode={darkMode} />
          )}
          {/* Save query button */}
          {onSaveQuery && !isStreaming && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
              <Tooltip title={saved ? 'Saved!' : 'Save this query'}>
                <IconButton
                  size="small"
                  onClick={() => {
                    onSaveQuery()
                    setSaved(true)
                    setTimeout(() => setSaved(false), 2000)
                  }}
                >
                  {saved ? <Check sx={{ fontSize: 16, color: 'success.main' }} /> : <BookmarkAdd sx={{ fontSize: 16 }} />}
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Paper>
        {/* Timestamp */}
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 0.5,
            px: 0.5,
            color: 'text.secondary',
            fontSize: '0.7rem',
            textAlign: isUser ? 'right' : 'left',
          }}
        >
          {formatTime(message.timestamp)}
          {!isUser && message.elapsedSeconds != null && ` · ${message.elapsedSeconds}s`}
        </Typography>
      </Box>

      {/* User avatar */}
      {isUser && (
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: 'grey.300',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            mt: 0.5,
          }}
        >
          <Person sx={{ fontSize: 18, color: 'grey.700' }} />
        </Box>
      )}
    </Box>
  )
}

function AssistantContent({
  message,
  isStreaming,
  darkMode,
}: {
  message: ChatMessage
  isStreaming?: boolean
  darkMode: boolean
}) {
  const validations = message.validations || []
  const lastValidation = validations.length ? validations[validations.length - 1] : null
  const hasRetries = validations.length > 1
  const lastSql = message.sql?.length ? message.sql[message.sql.length - 1] : null
  const vizConfig = message.vizConfig
  const results = message.results || []
  const isMetricCard = vizConfig?.chart_type === 'metric_card'

  const hasNoContent = !message.content && !message.thinkingSteps?.length && !lastSql && !results.length

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {/* Initial loading state — show before any events arrive */}
      {isStreaming && hasNoContent && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Analyzing your question...
          </Typography>
        </Box>
      )}

      {/* Thinking steps */}
      {message.thinkingSteps && message.thinkingSteps.length > 0 && (
        <ThinkingSteps steps={message.thinkingSteps} />
      )}

      {/* Validation badge */}
      {lastValidation && (
        <ValidationBadge validation={lastValidation} retryCount={hasRetries ? validations.length : undefined} />
      )}

      {/* SQL viewer */}
      {lastSql && <SqlViewer sql={lastSql} darkMode={darkMode} />}

      {/* Metric card */}
      {isMetricCard && results.length > 0 && results[0].rows?.length && (
        <MetricCard result={results[0]} vizConfig={vizConfig!} />
      )}

      {/* Chart */}
      {vizConfig && vizConfig.chart_type !== 'table' && vizConfig.chart_type !== 'metric_card' && results.length > 0 && (
        <ChartRenderer results={results} vizConfig={vizConfig} darkMode={darkMode} />
      )}

      {/* Results table */}
      {results.length > 0 && !isMetricCard && (
        <ResultTable results={results} />
      )}

      {/* Answer text */}
      {message.content && (
        <Box
          sx={{
            '& p': { m: 0 },
            '& p + p': { mt: 1 },
            '& code': {
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              fontSize: '0.85em',
              bgcolor: 'action.hover',
              px: 0.5,
              borderRadius: 0.5,
            },
            '& ul, & ol': { pl: 2.5, my: 0.5 },
            fontSize: '0.875rem',
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
        </Box>
      )}

      {/* Streaming cursor */}
      {isStreaming && (
        <Box
          component="span"
          sx={{
            display: 'inline-block',
            width: 8,
            height: 16,
            bgcolor: 'text.primary',
            animation: 'blink 1s step-end infinite',
            '@keyframes blink': {
              '50%': { opacity: 0 },
            },
          }}
        />
      )}
    </Box>
  )
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
