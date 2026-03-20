import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
} from '@mui/material'
import type { QueryResult } from '../../types'

interface ResultTableProps {
  results: QueryResult[]
}

export default function ResultTable({ results }: ResultTableProps) {
  const result = results[results.length - 1]
  if (!result?.rows?.length || !result.columns?.length) return null

  const columns = result.columns
  const rows = result.rows

  return (
    <Box>
      <TableContainer
        sx={{
          maxHeight: 320,
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map(col => (
                <TableCell
                  key={col}
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    bgcolor: 'action.hover',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i} hover>
                {columns.map(col => (
                  <TableCell
                    key={col}
                    sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                  >
                    {formatCell(row[col])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {result.total_rows != null && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {result.total_rows.toLocaleString()} rows
          {result.bytes_processed != null &&
            ` | ${formatBytes(result.bytes_processed)} processed`}
        </Typography>
      )}
    </Box>
  )
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'number') return value.toLocaleString()
  return String(value)
}

function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${n} B`
}
