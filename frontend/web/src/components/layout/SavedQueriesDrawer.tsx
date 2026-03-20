import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  IconButton,
  Box,
  Divider,
} from '@mui/material'
import { Delete, BookmarkBorder } from '@mui/icons-material'
import type { SavedQuery } from '../../hooks/useSavedQueries'

interface SavedQueriesDrawerProps {
  open: boolean
  onClose: () => void
  queries: SavedQuery[]
  onSelect: (question: string) => void
  onDelete: (id: string) => void
}

export default function SavedQueriesDrawer({
  open,
  onClose,
  queries,
  onSelect,
  onDelete,
}: SavedQueriesDrawerProps) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 340, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <BookmarkBorder />
          <Typography variant="h6" fontWeight={600}>
            Saved Queries
          </Typography>
        </Box>
        <Divider />
        {queries.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
            No saved queries yet.
          </Typography>
        ) : (
          <List dense>
            {queries.map(q => (
              <ListItem
                key={q.id}
                disablePadding
                secondaryAction={
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => onDelete(q.id)}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemButton
                  onClick={() => {
                    onSelect(q.question)
                    onClose()
                  }}
                >
                  <ListItemText
                    primary={q.name}
                    secondary={q.question}
                    primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 500 }}
                    secondaryTypographyProps={{ fontSize: '0.75rem', noWrap: true }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Drawer>
  )
}
