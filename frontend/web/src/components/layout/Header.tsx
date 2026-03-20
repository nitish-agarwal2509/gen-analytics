import { AppBar, Toolbar, Typography, IconButton, Tooltip, Box } from '@mui/material'
import {
  DarkMode,
  LightMode,
  AddComment,
  Analytics,
  BookmarkBorder,
} from '@mui/icons-material'

interface HeaderProps {
  darkMode: boolean
  onToggleDarkMode: () => void
  onNewSession: () => void
  onOpenSavedQueries: () => void
}

export default function Header({ darkMode, onToggleDarkMode, onNewSession, onOpenSavedQueries }: HeaderProps) {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Toolbar variant="dense" sx={{ gap: 1 }}>
        <Analytics sx={{ color: 'primary.main', fontSize: 28 }} />
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, color: 'text.primary', flexGrow: 1 }}
        >
          GenAnalytics
        </Typography>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Saved queries">
            <IconButton size="small" onClick={onOpenSavedQueries}>
              <BookmarkBorder fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="New conversation">
            <IconButton size="small" onClick={onNewSession}>
              <AddComment fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={darkMode ? 'Light mode' : 'Dark mode'}>
            <IconButton size="small" onClick={onToggleDarkMode}>
              {darkMode ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  )
}
