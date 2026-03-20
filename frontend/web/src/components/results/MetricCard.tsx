import { Paper, Typography } from '@mui/material'
import type { QueryResult, VizConfig } from '../../types'

interface MetricCardProps {
  result: QueryResult
  vizConfig: VizConfig
}

export default function MetricCard({ result, vizConfig }: MetricCardProps) {
  if (!result.rows?.length) return null

  const row = result.rows[0]
  const valueKey = vizConfig.y_axis || (result.columns?.[0] ?? '')
  const value = row[valueKey]

  const formatted =
    typeof value === 'number'
      ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : String(value ?? '-')

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: 1,
        borderColor: 'divider',
        textAlign: 'center',
        bgcolor: 'action.hover',
      }}
    >
      <Typography variant="h4" fontWeight={700} color="primary.main">
        {formatted}
      </Typography>
      {vizConfig.title && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {vizConfig.title}
        </Typography>
      )}
    </Paper>
  )
}
