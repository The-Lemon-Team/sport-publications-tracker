import { createContext, useContext, type ReactNode } from 'react'
import type { OAuthConnectionDto } from '@spt/shared'
import type { LiveSubscriberSource } from '@/lib/provider-connections'
import type { WeeklyPublicationInsight } from '@/features/dashboard/lib/sidebar-user-stats'

type DashboardShellContextValue = {
  subscriberSources: LiveSubscriberSource[]
  weeklyPublications: WeeklyPublicationInsight[]
  oauthConnections: OAuthConnectionDto[]
  connectingId: string | null
  oauthError: string | null
  onConnectOAuth: (id: string) => void
  onYouTubeChannelAdded: () => void
}

const DashboardShellContext = createContext<DashboardShellContextValue | null>(
  null,
)

export function DashboardShellProvider({
  value,
  children,
}: {
  value: DashboardShellContextValue
  children: ReactNode
}) {
  return (
    <DashboardShellContext.Provider value={value}>
      {children}
    </DashboardShellContext.Provider>
  )
}

export function useDashboardShell() {
  const context = useContext(DashboardShellContext)
  if (!context) {
    throw new Error('useDashboardShell must be used within DashboardShellProvider')
  }
  return context
}
