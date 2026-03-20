import { useState, useMemo, useCallback } from 'react'
import { ThemeProvider, CssBaseline, Box, Snackbar, Alert, Slide } from '@mui/material'
import { buildMuiTheme } from './styles/theme'
import Header from './components/layout/Header'
import ChatView from './components/layout/ChatView'
import SavedQueriesDrawer from './components/layout/SavedQueriesDrawer'
import useSavedQueries from './hooks/useSavedQueries'
import useToast from './hooks/useToast'
import type { ChatMessage } from './types'

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('gen-analytics-dark-mode')
    if (stored !== null) return stored === 'true'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pendingQuery, setPendingQuery] = useState<string | null>(null)

  const theme = useMemo(() => buildMuiTheme(darkMode), [darkMode])
  const savedQueries = useSavedQueries()
  const { toast, show: showToast, close: closeToast } = useToast()

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => {
      const next = !prev
      localStorage.setItem('gen-analytics-dark-mode', String(next))
      return next
    })
  }, [])

  const handleNewSession = useCallback(() => {
    setMessages([])
    setSessionId(null)
    showToast('New conversation started', 'info')
  }, [showToast])

  const handleSelectSavedQuery = useCallback((question: string) => {
    setPendingQuery(question)
  }, [])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <Header
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          onNewSession={handleNewSession}
          onOpenSavedQueries={() => setDrawerOpen(true)}
        />
        <ChatView
          messages={messages}
          setMessages={setMessages}
          sessionId={sessionId}
          setSessionId={setSessionId}
          darkMode={darkMode}
          pendingQuery={pendingQuery}
          onPendingQueryConsumed={() => setPendingQuery(null)}
          onSaveQuery={savedQueries.save}
          showToast={showToast}
        />
        <SavedQueriesDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          queries={savedQueries.queries}
          onSelect={handleSelectSavedQuery}
          onDelete={savedQueries.remove}
        />
      </Box>

      {/* Global toast */}
      <Snackbar
        open={toast.open}
        onClose={closeToast}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        TransitionComponent={Slide}
      >
        <Alert
          onClose={closeToast}
          severity={toast.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  )
}
