import { Box, Typography } from '@mui/material'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { QueryResult, VizConfig } from '../../types'

interface ChartRendererProps {
  results: QueryResult[]
  vizConfig: VizConfig
  darkMode: boolean
}

export default function ChartRenderer({ results, vizConfig, darkMode }: ChartRendererProps) {
  const result = results[results.length - 1]
  if (!result?.rows?.length) return null

  const { chart_type, x_axis, y_axis, title } = vizConfig
  if (!x_axis || !y_axis) return null

  const data = result.rows.map(row => ({
    ...row,
    [y_axis]: typeof row[y_axis] === 'number' ? row[y_axis] : Number(row[y_axis]) || 0,
  }))

  const isBar = chart_type === 'bar' || chart_type === 'bar_chart'
  const isLine = chart_type === 'line' || chart_type === 'line_chart'

  const color = darkMode ? '#60a5fa' : '#2563eb'
  const gridColor = darkMode ? '#333' : '#eee'
  const textColor = darkMode ? '#94a3b8' : '#64748b'

  return (
    <Box sx={{ my: 1 }}>
      {title && (
        <Typography variant="caption" fontWeight={500} sx={{ mb: 1, display: 'block' }}>
          {title}
        </Typography>
      )}
      <ResponsiveContainer width="100%" height={280}>
        {isBar ? (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey={x_axis} tick={{ fontSize: 11, fill: textColor }} />
            <YAxis tick={{ fontSize: 11, fill: textColor }} />
            <Tooltip />
            <Bar dataKey={y_axis} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : !isLine ? (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey={x_axis} tick={{ fontSize: 11, fill: textColor }} />
            <YAxis tick={{ fontSize: 11, fill: textColor }} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey={y_axis}
              stroke={color}
              fill={color}
              fillOpacity={0.15}
            />
          </AreaChart>
        ) : (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey={x_axis} tick={{ fontSize: 11, fill: textColor }} />
            <YAxis tick={{ fontSize: 11, fill: textColor }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey={y_axis}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </Box>
  )
}
