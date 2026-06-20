import { useTranslation } from 'react-i18next'
import { useEffect, useMemo, useState } from 'react'
import type { OAuthConnectionDto, SubscriberSourceDto } from '@spt/shared'
import { Outlet, useLocation } from 'react-router-dom'
import {
  useGetOAuthConnectionsQuery,
  useGetSubscriberSourcesQuery,
  useSyncSubscriberSourcesMutation,
  useCreateSubscriberSourceMutation,
} from '@/app/api/baseApi'
import { DashboardShellProvider } from '@/features/dashboard/DashboardShellContext'
import { DashboardTopicsProvider } from '@/features/dashboard/DashboardTopicsProvider'
import { useDashboardTopicsContext } from '@/features/dashboard/DashboardTopicsProvider'
import { DashboardSidebar } from '@/features/dashboard/components/DashboardSidebar'
import { OAuthConnectingOverlay } from '@/features/dashboard/components/OAuthConnectingOverlay'
import {
  navFromPath,
  pageSubtitleKey,
  pageTitleKey,
  PAGES_WITH_CUSTOM_HEADER,
} from '@/features/dashboard/lib/nav'
import {
  collectWeeklyPublications,
  computeSidebarUserStats,
} from '@/features/dashboard/lib/sidebar-user-stats'
import { startProviderOAuth } from '@/lib/startOAuth'
import {
  getOAuthConnectionProviderId,
  getSubscribableSourceType,
  loadStoredYouTubeChannels,
  YOUTUBE_CHANNELS_STORAGE_KEY,
  type LiveSubscriberSource,
} from '@/lib/provider-connections'
import { providerIdFromEnum } from '@/lib/providers'

const SUBSCRIBER_SYNC_INTERVAL_MS = 60_000

function mapDbSourceToLive(source: SubscriberSourceDto): LiveSubscriberSource {
  const sourceType = getSubscribableSourceType(
    providerIdFromEnum(source.provider),
  )
  return {
    key: `${providerIdFromEnum(source.provider)}:${source.externalId}`,
    sourceId: source.id,
    providerId: providerIdFromEnum(source.provider),
    handle: source.handle ?? source.externalId,
    baseSubscribers: source.subscriberCount ?? 0,
    drift: sourceType?.drift ?? [0, 0],
    pollInput: source.externalId,
    channelId: source.externalId,
    sessionDelta: source.sessionDelta,
    lastChangedAt: source.lastChangedAt,
    lastChange: source.lastChange,
  }
}

function DashboardChrome() {
  const { t } = useTranslation()
  const location = useLocation()
  const activeNav = navFromPath(location.pathname)
  const hasCustomHeader = PAGES_WITH_CUSTOM_HEADER.has(activeNav)

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {!hasCustomHeader ? (
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 px-4 py-4 backdrop-blur-xl md:px-6">
          <h1 className="text-xl font-semibold tracking-tight">
            {t(pageTitleKey(activeNav))}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(pageSubtitleKey(activeNav))}
          </p>
        </header>
      ) : null}
      <Outlet />
    </div>
  )
}

export function DashboardLayout() {
  const location = useLocation()
  const activeNav = navFromPath(location.pathname)
  const { data: oauthConnections, refetch: refetchOAuth } =
    useGetOAuthConnectionsQuery()
  const { data: dbSubscriberSources, refetch: refetchSubscriberSources } =
    useGetSubscriberSourcesQuery()
  const [syncSubscriberSources] = useSyncSubscriberSourcesMutation()
  const [createSubscriberSource] = useCreateSubscriberSourceMutation()
  const [syncedSources, setSyncedSources] = useState<SubscriberSourceDto[]>([])
  const [oauthError, setOauthError] = useState<string | null>(null)
  const [oauthConnectingId, setOauthConnectingId] = useState<string | null>(
    null,
  )

  const oauthConnected = useMemo(() => {
    if (!oauthConnections?.length) return []
    return oauthConnections.filter((c) => c.status === 'ACTIVE')
  }, [oauthConnections])

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) return

    async function runSync() {
      try {
        const result = await syncSubscriberSources().unwrap()
        setSyncedSources(result)
      } catch {
        // Keep the last known values when sync fails.
      }
    }

    void runSync()
    const interval = setInterval(runSync, SUBSCRIBER_SYNC_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [syncSubscriberSources])

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) return
    const legacyChannels = loadStoredYouTubeChannels()
    if (legacyChannels.length === 0) return
    if (dbSubscriberSources && dbSubscriberSources.length > 0) {
      localStorage.removeItem(YOUTUBE_CHANNELS_STORAGE_KEY)
      return
    }

    void (async () => {
      for (const channel of legacyChannels) {
        try {
          await createSubscriberSource({ input: channel.pollInput }).unwrap()
        } catch {
          // Skip channels that fail migration.
        }
      }
      localStorage.removeItem(YOUTUBE_CHANNELS_STORAGE_KEY)
      await refetchSubscriberSources()
    })()
  }, [
    createSubscriberSource,
    dbSubscriberSources,
    refetchSubscriberSources,
  ])

  const trackedSources = useMemo(() => {
    const byId = new Map(
      (dbSubscriberSources ?? []).map((source) => [source.id, source]),
    )
    for (const synced of syncedSources) {
      byId.set(synced.id, synced)
    }
    return [...byId.values()].map(mapDbSourceToLive)
  }, [dbSubscriberSources, syncedSources])

  const subscriberSources = useMemo((): LiveSubscriberSource[] => {
    const sources: LiveSubscriberSource[] = [...trackedSources]

    for (const connection of oauthConnected) {
      const providerId = getOAuthConnectionProviderId(connection.provider)
      const sourceType = getSubscribableSourceType(providerId)
      if (!sourceType || sourceType.kind !== 'oauth') continue
      sources.push({
        key: `${providerId}:${connection.externalAccountId}`,
        oauthConnectionId: connection.id,
        providerId,
        handle: connection.channelName ?? sourceType.defaultHandle,
        baseSubscribers:
          connection.subscriberCount ?? sourceType.baseSubscribers,
        drift: sourceType.drift,
      })
    }

    return sources
  }, [oauthConnected, trackedSources])

  function connectProvider(id: string) {
    if (oauthConnectingId || id !== 'instagram') return
    setOauthError(null)

    const token = localStorage.getItem('accessToken')
    if (!token) {
      setOauthError('Войдите в аккаунт, чтобы подключить площадку')
      return
    }

    void startProviderOAuth(id, {
      onPreparingChange: (preparing) =>
        setOauthConnectingId(preparing ? id : null),
    })
      .then(async () => {
        const result = await refetchOAuth()
        const hasActive = result.data?.some(
          (c) => c.status === 'ACTIVE' && c.provider === 'FACEBOOK',
        )
        if (!hasActive) {
          setOauthError('Подключение не сохранилось. Попробуйте ещё раз.')
        }
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Не удалось подключить аккаунт'
        if (message !== 'OAuth timed out') {
          setOauthError(message)
        }
      })
  }

  function handleYouTubeChannelAdded() {
    void refetchSubscriberSources()
  }

  return (
    <DashboardTopicsProvider>
      <DashboardLayoutInner
        activeNav={activeNav}
        subscriberSources={subscriberSources}
        oauthConnections={oauthConnections ?? []}
        oauthError={oauthError}
        connectingId={oauthConnectingId}
        onConnectOAuth={connectProvider}
        onYouTubeChannelAdded={handleYouTubeChannelAdded}
      />
    </DashboardTopicsProvider>
  )
}

function DashboardLayoutInner({
  activeNav,
  subscriberSources,
  oauthConnections,
  oauthError,
  connectingId,
  onConnectOAuth,
  onYouTubeChannelAdded,
}: {
  activeNav: ReturnType<typeof navFromPath>
  subscriberSources: LiveSubscriberSource[]
  oauthConnections: OAuthConnectionDto[]
  oauthError: string | null
  connectingId: string | null
  onConnectOAuth: (id: string) => void
  onYouTubeChannelAdded: () => void
}) {
  const { sourceTopics } = useDashboardTopicsContext()

  const sidebarUserStats = useMemo(
    () => computeSidebarUserStats(sourceTopics, subscriberSources),
    [sourceTopics, subscriberSources],
  )

  const weeklyPublications = useMemo(
    () => collectWeeklyPublications(sourceTopics, subscriberSources),
    [sourceTopics, subscriberSources],
  )

  const shellValue = useMemo(
    () => ({
      subscriberSources,
      weeklyPublications,
      oauthConnections: oauthConnections,
      connectingId,
      oauthError,
      onConnectOAuth,
      onYouTubeChannelAdded,
    }),
    [
      subscriberSources,
      weeklyPublications,
      oauthConnections,
      connectingId,
      oauthError,
      onConnectOAuth,
      onYouTubeChannelAdded,
    ],
  )

  return (
    <DashboardShellProvider value={shellValue}>
      <div className="flex min-h-svh bg-background">
        <DashboardSidebar active={activeNav} userStats={sidebarUserStats} />
        <DashboardChrome />
        {connectingId ? (
          <OAuthConnectingOverlay providerId={connectingId} />
        ) : null}
      </div>
    </DashboardShellProvider>
  )
}
