import { Box, Typography } from '@mui/material'
import { CheckCircle, Warning, Replay } from '@mui/icons-material'
import type { ValidationResult } from '../../types'

function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${n} B`
}

interface ValidationBadgeProps {
  validation: ValidationResult
  retryCount?: number
}

export default function ValidationBadge({ validation, retryCount }: ValidationBadgeProps) {
  const isValid = validation.is_valid
  const bytes = validation.estimated_bytes ?? 0
  const cost = validation.estimated_cost_usd ?? 0
  const needsApproval = validation.requires_approval

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.5,
        py: 0.5,
        borderRadius: 2,
        bgcolor: needsApproval
          ? 'warning.main'
          : isValid
            ? 'success.main'
            : 'error.main',
        color: 'white',
        fontSize: '0.75rem',
        width: 'fit-content',
      }}
    >
      {needsApproval ? (
        <Warning sx={{ fontSize: 14 }} />
      ) : isValid ? (
        <CheckCircle sx={{ fontSize: 14 }} />
      ) : (
        <Warning sx={{ fontSize: 14 }} />
      )}
      <Typography variant="caption" sx={{ color: 'inherit', fontWeight: 500 }}>
        {needsApproval
          ? `Expensive query - Scan: ${formatBytes(bytes)} - $${cost.toFixed(6)}`
          : isValid
            ? `Validated - Scan: ${formatBytes(bytes)} - $${cost.toFixed(6)}`
            : `Validation failed: ${validation.errors?.[0] ?? 'Unknown error'}`}
      </Typography>
      {retryCount && retryCount > 1 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, ml: 0.5 }}>
          <Replay sx={{ fontSize: 12 }} />
          <Typography variant="caption" sx={{ color: 'inherit' }}>
            {retryCount} attempts
          </Typography>
        </Box>
      )}
    </Box>
  )
}
