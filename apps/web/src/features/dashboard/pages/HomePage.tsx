import { useTranslation } from 'react-i18next'
import { DashboardGlobalStats } from '@/features/dashboard/components/DashboardGlobalStats'
import { LiveSubscribers } from '@/features/dashboard/components/LiveSubscribers'
import { NextStepsPanel } from '@/features/dashboard/components/NextStepsPanel'
import { ContentGridPromoBlock } from '@/features/dashboard/components/ContentGridPromoBlock'
import { WeeklyPublicationsPanel } from '@/features/dashboard/components/WeeklyPublicationsPanel'
import { useDashboardShell } from '@/features/dashboard/DashboardShellContext'
import { useDashboardTopicsContext } from '@/features/dashboard/DashboardTopicsProvider'
import {
  DASHBOARD_NAV,
  pageSubtitleKey,
  pageTitleKey,
} from '@/features/dashboard/lib/nav'
import { aggregateAll } from '@/lib/dashboard-utils'

export function HomePage() {
  const { t } = useTranslation()
  const {
    subscriberSources,
    weeklyPublications,
    connectingId,
    onConnectOAuth,
    onYouTubeChannelAdded,
  } = useDashboardShell()
  const { sourceTopics } = useDashboardTopicsContext()
  const totals = aggregateAll(sourceTopics)

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 px-4 py-4 backdrop-blur-xl md:px-6">
        <h1 className="text-xl font-semibold tracking-tight">
          {t(pageTitleKey(DASHBOARD_NAV.home))}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t(pageSubtitleKey(DASHBOARD_NAV.home))}
        </p>
      </header>

      <main className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-6">
        <div id="live-subscribers">
          <LiveSubscribers
            sources={subscriberSources}
            connectingId={connectingId}
            onConnectOAuth={onConnectOAuth}
            onYouTubeChannelAdded={onYouTubeChannelAdded}
          />
        </div>

        <DashboardGlobalStats
          views={totals.views}
          comments={totals.comments}
          likes={totals.likes}
          activeTopics={sourceTopics.length}
        />

        <NextStepsPanel />

        <WeeklyPublicationsPanel publications={weeklyPublications} />

        <ContentGridPromoBlock />
      </main>
    </>
  )
}
