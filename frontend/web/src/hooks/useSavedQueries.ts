/** Hook for saved queries CRUD. */

import { useState, useCallback, useEffect } from 'react'
import config from '../config'

export interface SavedQuery {
  id: string
  name: string
  description: string
  question: string
  sql: string
  created_at: string
}

const API = `${config.api.baseUrl}/api/v1/queries/saved`

export default function useSavedQueries() {
  const [queries, setQueries] = useState<SavedQuery[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(API)
      if (res.ok) setQueries(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  const save = useCallback(
    async (data: { name: string; description?: string; question: string; sql: string }) => {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to save query')
      const saved: SavedQuery = await res.json()
      setQueries(prev => [saved, ...prev])
      return saved
    },
    [],
  )

  const remove = useCallback(async (id: string) => {
    await fetch(`${API}/${id}`, { method: 'DELETE' })
    setQueries(prev => prev.filter(q => q.id !== id))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { queries, loading, save, remove, refresh }
}
