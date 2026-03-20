/** App configuration — API endpoints, feature flags. */

const BASE_API_URL = import.meta.env.VITE_API_BASE_URL || ''

export const config = {
  api: {
    baseUrl: BASE_API_URL,
    timeout: 300_000,
    endpoints: {
      runSSE: '/run_sse',
      apps: '/apps',
      listApps: '/list-apps',
      health: '/health',
    },
  },
  app: {
    title: 'GenAnalytics',
    version: '0.1.0',
    agentName: 'gen_analytics',
    defaultUserId: 'web_user',
  },
  features: {
    streaming: true,
    darkMode: true,
  },
} as const

export default config
