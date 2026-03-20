/**
 * GenAnalytics Theme Configuration
 * Centralized theme with light/dark color tokens.
 */

import { createTheme, type Theme } from '@mui/material/styles'

export interface ThemeColors {
  bg: string
  paper: string
  userBubble: string
  assistantBubble: string
  toolBubble: string
  text: string
  textMuted: string
  border: string
  input: string
  accent: string
  error: string
  success: string
  warning: string
  sqlBg: string
}

export const lightColors: ThemeColors = {
  bg: '#f8fafc',
  paper: '#ffffff',
  userBubble: '#2563eb',
  assistantBubble: '#f1f5f9',
  toolBubble: '#dbeafe',
  text: '#1e293b',
  textMuted: '#64748b',
  border: '#e2e8f0',
  input: '#ffffff',
  accent: '#2563eb',
  error: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
  sqlBg: '#f8fafc',
}

export const darkColors: ThemeColors = {
  bg: '#0a0a0a',
  paper: '#141414',
  userBubble: '#1e40af',
  assistantBubble: '#1f1f1f',
  toolBubble: '#172554',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  border: '#2d2d2d',
  input: '#1a1a1a',
  accent: '#60a5fa',
  error: '#f87171',
  success: '#4ade80',
  warning: '#fbbf24',
  sqlBg: '#1a1a2e',
}

export const getThemeColors = (darkMode: boolean): ThemeColors =>
  darkMode ? darkColors : lightColors

export const buildMuiTheme = (darkMode: boolean): Theme => {
  const colors = getThemeColors(darkMode)
  return createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: { main: colors.accent },
      error: { main: colors.error },
      success: { main: colors.success },
      warning: { main: colors.warning },
      background: {
        default: colors.bg,
        paper: colors.paper,
      },
      text: {
        primary: colors.text,
        secondary: colors.textMuted,
      },
      divider: colors.border,
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      fontSize: 14,
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 500 },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
    },
  })
}

export const typography = {
  fontFamily: {
    primary: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    mono: '"JetBrains Mono", "Fira Code", "Monaco", monospace',
  },
}
