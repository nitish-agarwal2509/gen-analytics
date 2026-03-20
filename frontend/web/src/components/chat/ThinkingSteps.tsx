import { Box, Typography, CircularProgress } from '@mui/material'
import { CheckCircle, Error as ErrorIcon } from '@mui/icons-material'
import type { ThinkingStep } from '../../types'

interface ThinkingStepsProps {
  steps: ThinkingStep[]
}

export default function ThinkingSteps({ steps }: ThinkingStepsProps) {
  if (!steps.length) return null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, my: 1 }}>
      {steps.map((step, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: 'text.secondary',
            fontSize: '0.8rem',
          }}
        >
          {step.status === 'running' ? (
            <CircularProgress size={14} />
          ) : step.status === 'error' ? (
            <ErrorIcon sx={{ fontSize: 14, color: 'error.main' }} />
          ) : (
            <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} />
          )}
          <Typography variant="caption" color="text.secondary">
            {step.label}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}
