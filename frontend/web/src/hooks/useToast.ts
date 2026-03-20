/** Simple toast notification state hook. */

import { useState, useCallback } from 'react'

export type ToastSeverity = 'success' | 'error' | 'info' | 'warning'

export interface ToastState {
  open: boolean
  message: string
  severity: ToastSeverity
}

export default function useToast() {
  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: '',
    severity: 'info',
  })

  const show = useCallback((message: string, severity: ToastSeverity = 'info') => {
    setToast({ open: true, message, severity })
  }, [])

  const close = useCallback(() => {
    setToast(prev => ({ ...prev, open: false }))
  }, [])

  return { toast, show, close }
}
