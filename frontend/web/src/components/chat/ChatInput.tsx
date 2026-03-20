import { useState, useCallback, type KeyboardEvent } from 'react'
import { TextField, IconButton, Box } from '@mui/material'
import { Send, Stop } from '@mui/icons-material'

interface ChatInputProps {
  onSend: (message: string) => void
  onCancel: () => void
  isStreaming: boolean
  disabled?: boolean
}

export default function ChatInput({ onSend, onCancel, isStreaming, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isStreaming) return
    onSend(trimmed)
    setValue('')
  }, [value, isStreaming, onSend])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  return (
    <Box
      sx={{
        p: 2,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', gap: 1, maxWidth: 840, mx: 'auto' }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="Ask a question about your data..."
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
            },
          }}
        />
        {isStreaming ? (
          <IconButton
            onClick={onCancel}
            color="error"
            sx={{ alignSelf: 'flex-end' }}
          >
            <Stop />
          </IconButton>
        ) : (
          <IconButton
            onClick={handleSend}
            disabled={!value.trim() || disabled}
            color="primary"
            sx={{ alignSelf: 'flex-end' }}
          >
            <Send />
          </IconButton>
        )}
      </Box>
    </Box>
  )
}
