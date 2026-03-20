import { Box, Typography, Chip } from '@mui/material'
import { Analytics } from '@mui/icons-material'

const EXAMPLE_QUERIES = [
  'What was the total payout amount last month?',
  'How many successful payouts in the last 7 days?',
  'Show payouts by status for the last 30 days',
  'Show daily payout count for the last 2 weeks',
  'Top 10 reward events by count last month',
]

interface WelcomeScreenProps {
  onSelectQuery: (query: string) => void
}

export default function WelcomeScreen({ onSelectQuery }: WelcomeScreenProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 1,
        gap: 3,
        px: 3,
        pb: 8,
      }}
    >
      <Analytics sx={{ fontSize: 48, color: 'primary.main', opacity: 0.8 }} />
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          What would you like to know?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Ask any question about your data in plain English
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 1,
          maxWidth: 600,
        }}
      >
        {EXAMPLE_QUERIES.map(q => (
          <Chip
            key={q}
            label={q}
            variant="outlined"
            onClick={() => onSelectQuery(q)}
            sx={{
              cursor: 'pointer',
              borderRadius: 4,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          />
        ))}
      </Box>
    </Box>
  )
}
