import type { ComponentType } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  Eye,
  LayoutGrid,
  MessageCircle,
  Plus,
  Search,
  Table as TableIcon,
  ThumbsUp,
  TrendingUp,
} from 'lucide-react'
import { useGetOAuthConnectionsQuery, useGetTopicsQuery } from '@/app/api/baseApi'
import { UnderDevelopment } from '@/components/UnderDevelopment'
import { ContentMetricsTable } from '@/features/content-table/components/ContentMetricsTable'
import { DEMO_TOPICS } from '@/features/content-table/lib/demo-data'
import { CalendarView } from '@/features/calendar/CalendarView'
import {
  DASHBOARD_NAV,
  PAGE_TITLES,
  UNDER_DEVELOPMENT_PAGES,
  type DashboardNavItem,
} from '@/features/dashboard/lib/nav'
import { SettingsView } from '@/features/settings/SettingsView'
import { CONNECTABLE_PROVIDERS } from '@/lib/provider-connections'
import {
  aggregateAll,
  formatNumber,
  toTopicViews,
  type TopicView,
} from '@/lib/dashboard-utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DashboardSidebar } from './components/DashboardSidebar'
import { TopicSection } from './components/TopicSection'
import { ConnectProviders } from './components/ConnectProviders'
import { LiveSubscribers } from './components/LiveSubscribers'
import {
  AddPublicationDialog,
  type NewPublicationInput,
  type StageOption,
} from './components/AddPublicationDialog'

function GlobalStat({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <div className="leading-tight">
        <p className="font-mono text-xl font-semibold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function ContentGridView({
  topics,
  sourceTopics,
  connected,
  onConnect,
}: {
  topics: TopicView[]
  sourceTopics: typeof DEMO_TOPICS
  connected: string[]
  onConnect: (id: string) => void
}) {
  const [view, setView] = useState<'cards' | 'table'>('cards')
  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [defaultStageKey, setDefaultStageKey] = useState<string | undefined>()
  const [localTopics, setLocalTopics] = useState(topics)

  useEffect(() => {
    setLocalTopics(topics)
  }, [topics])

  const totals = aggregateAll(sourceTopics)

  const stageOptions: StageOption[] = localTopics.flatMap((topic) =>
    topic.stages.map((stage) => ({
      topicId: topic.id,
      topicName: topic.name,
      stageId: stage.id,
      stageName: stage.name,
    })),
  )

  const filteredTopics = localTopics.filter((topic) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      topic.name.toLowerCase().includes(q) ||
      topic.category.toLowerCase().includes(q)
    )
  })

  function openDialogForStage(topicId: string, stageId: string) {
    setDefaultStageKey(`${topicId}::${stageId}`)
    setDialogOpen(true)
  }

  function openDialogGlobal() {
    setDefaultStageKey(undefined)
    setDialogOpen(true)
  }

  function handleAddPublication(topicId: string, input: NewPublicationInput) {
    setLocalTopics((prev) =>
      prev.map((topic) => {
        if (topic.id !== topicId) return topic
        return {
          ...topic,
          stages: topic.stages.map((stage) => {
            if (stage.id !== input.stageId) return stage
            return {
              ...stage,
              publications: [
                ...stage.publications,
                {
                  id: `pub-${Date.now()}`,
                  providerId: input.providerId,
                  label: input.label,
                  stageId: input.stageId,
                  url: input.url,
                  status: input.status,
                  metrics: { views: 0, likes: 0, comments: 0 },
                },
              ],
            }
          }),
        }
      }),
    )
  }

  return (
    <>
      <header className="sticky top-0 z-20 flex flex-col gap-4 border-b border-border bg-background/80 px-4 py-4 backdrop-blur-xl md:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {PAGE_TITLES[DASHBOARD_NAV.content].title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {PAGE_TITLES[DASHBOARD_NAV.content].subtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5">
            <Button
              size="sm"
              variant={view === 'cards' ? 'secondary' : 'ghost'}
              onClick={() => setView('cards')}
            >
              <LayoutGrid className="size-4" />
              <span className="hidden md:inline">Карточки</span>
            </Button>
            <Button
              size="sm"
              variant={view === 'table' ? 'secondary' : 'ghost'}
              onClick={() => setView('table')}
            >
              <TableIcon className="size-4" />
              <span className="hidden md:inline">Таблица</span>
            </Button>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Поиск по темам…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button onClick={openDialogGlobal}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add Publication</span>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-6">
        <LiveSubscribers connected={connected} onConnect={onConnect} />

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <GlobalStat
            label="Total Views"
            value={formatNumber(totals.views)}
            icon={Eye}
          />
          <GlobalStat
            label="Total Comments"
            value={formatNumber(totals.comments)}
            icon={MessageCircle}
          />
          <GlobalStat
            label="Total Likes"
            value={formatNumber(totals.likes)}
            icon={ThumbsUp}
          />
          <GlobalStat
            label="Active Topics"
            value={String(localTopics.length)}
            icon={TrendingUp}
          />
        </section>

        <section className="flex flex-col gap-5">
          {filteredTopics.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Ничего не найдено по запросу «{query}»
            </div>
          ) : view === 'table' ? (
            <ContentMetricsTable
              topics={sourceTopics}
              onAddPublication={openDialogForStage}
            />
          ) : (
            filteredTopics.map((topic) => (
              <TopicSection
                key={topic.id}
                topic={topic}
                onAddPublication={openDialogForStage}
              />
            ))
          )}
        </section>
      </main>

      <AddPublicationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        stageOptions={stageOptions}
        defaultStageKey={defaultStageKey}
        onSubmit={handleAddPublication}
      />
    </>
  )
}

export function ContentDashboard() {
  const { data: apiTopics, isError: topicsError } = useGetTopicsQuery()
  const { data: oauthConnections } = useGetOAuthConnectionsQuery()
  const [activeNav, setActiveNav] = useState<DashboardNavItem>(
    DASHBOARD_NAV.content,
  )

  const sourceTopics = useMemo(
    () => (topicsError || !apiTopics?.length ? DEMO_TOPICS : apiTopics),
    [apiTopics, topicsError],
  )

  const [topics, setTopics] = useState<TopicView[]>(() =>
    toTopicViews(sourceTopics),
  )

  useEffect(() => {
    setTopics(toTopicViews(sourceTopics))
  }, [sourceTopics])

  const oauthConnected = useMemo(() => {
    if (!oauthConnections?.length) return []
    const map: Record<string, string> = {
      VK: 'vk',
      GOOGLE: 'youtube',
      FACEBOOK: 'instagram',
    }
    return oauthConnections
      .filter((c) => c.status === 'ACTIVE')
      .map((c) => map[c.provider])
      .filter(Boolean)
  }, [oauthConnections])

  const [localConnected, setLocalConnected] = useState<string[]>([])
  const connected = oauthConnected.length > 0 ? oauthConnected : localConnected

  const hasConnections = connected.length > 0
  const pageMeta = PAGE_TITLES[activeNav]
  const isContentGrid = activeNav === DASHBOARD_NAV.content
  const isUnderDevelopment = UNDER_DEVELOPMENT_PAGES.includes(activeNav)
  const showConnectGate = isContentGrid && !hasConnections

  function connectProvider(id: string) {
    const token = localStorage.getItem('accessToken')
    if (token) {
      window.location.href = `/api/oauth/start/${id}`
      return
    }
    setLocalConnected((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  function connectAll() {
    for (const cp of CONNECTABLE_PROVIDERS) {
      if (!connected.includes(cp.id)) connectProvider(cp.id)
    }
  }

  function renderMain() {
    if (showConnectGate) {
      return (
        <ConnectProviders
          connected={connected}
          onConnect={connectProvider}
          onConnectAll={connectAll}
        />
      )
    }

    if (isContentGrid) {
      return (
        <ContentGridView
          topics={topics}
          sourceTopics={sourceTopics}
          connected={connected}
          onConnect={connectProvider}
        />
      )
    }

    if (activeNav === DASHBOARD_NAV.calendar) {
      return <CalendarView topics={sourceTopics} />
    }

    if (activeNav === DASHBOARD_NAV.settings) {
      return <SettingsView />
    }

    if (isUnderDevelopment) {
      return <UnderDevelopment title={activeNav} />
    }

    return null
  }

  return (
    <div className="flex min-h-svh bg-background">
      <DashboardSidebar active={activeNav} onNavigate={setActiveNav} />

      <div className="flex min-w-0 flex-1 flex-col">
        {!isContentGrid || hasConnections ? (
          !isContentGrid ? (
            <header className="sticky top-0 z-20 border-b border-border bg-background/80 px-4 py-4 backdrop-blur-xl md:px-6">
              <h1 className="text-xl font-semibold tracking-tight">
                {pageMeta.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {pageMeta.subtitle}
              </p>
            </header>
          ) : null
        ) : null}

        {renderMain()}
      </div>
    </div>
  )
}
