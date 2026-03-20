import { useState, useRef, useEffect } from 'react'
import { Box, IconButton, Collapse, Typography, Tooltip } from '@mui/material'
import { Code, ContentCopy, ExpandMore, ExpandLess } from '@mui/icons-material'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { sql } from '@codemirror/lang-sql'

interface SqlViewerProps {
  sql: string
  darkMode: boolean
}

export default function SqlViewer({ sql: sqlText, darkMode }: SqlViewerProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  useEffect(() => {
    if (!expanded || !editorRef.current) return

    // Destroy previous editor
    viewRef.current?.destroy()

    const state = EditorState.create({
      doc: sqlText,
      extensions: [
        basicSetup,
        sql(),
        EditorView.editable.of(false),
        EditorView.theme({
          '&': { fontSize: '0.8rem', maxHeight: '300px' },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-gutters': { display: 'none' },
        }),
      ],
    })

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    })

    return () => {
      viewRef.current?.destroy()
      viewRef.current = null
    }
  }, [expanded, sqlText, darkMode])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sqlText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 0.75,
          cursor: 'pointer',
          bgcolor: 'action.hover',
          '&:hover': { bgcolor: 'action.selected' },
        }}
      >
        <Code sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="caption" fontWeight={500} sx={{ flexGrow: 1 }}>
          SQL Query
        </Typography>
        <Tooltip title={copied ? 'Copied!' : 'Copy SQL'}>
          <IconButton
            size="small"
            onClick={e => {
              e.stopPropagation()
              handleCopy()
            }}
          >
            <ContentCopy sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
        {expanded ? (
          <ExpandLess sx={{ fontSize: 18, color: 'text.secondary' }} />
        ) : (
          <ExpandMore sx={{ fontSize: 18, color: 'text.secondary' }} />
        )}
      </Box>
      <Collapse in={expanded}>
        <Box ref={editorRef} sx={{ '& .cm-editor': { borderRadius: 0 } }} />
      </Collapse>
    </Box>
  )
}
