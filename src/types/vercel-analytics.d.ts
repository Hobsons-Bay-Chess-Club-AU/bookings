import type React from 'react'

declare module '@vercel/analytics/react' {
  export const Analytics: React.ComponentType
}

declare module '@vercel/speed-insights/next' {
  export const SpeedInsights: React.ComponentType
}


