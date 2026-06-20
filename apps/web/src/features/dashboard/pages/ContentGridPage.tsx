import type { MetricHistoryEntryDto } from '@spt/shared'
import { MetricTrackingMode, PublicationStatus } from '@spt/shared'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LayoutGrid, Loader2, Plus, Search, Table as TableIcon } from 'lucide-react'
import { ContentMetricsTable } from '@/features/content-table/components/ContentMetricsTable'
import { useDashboardShell } from '@/features/dashboard/DashboardShellContext'
import { useDashboardTopicsContext } from '@/features/dashboard/DashboardTopicsProvider'
import { DashboardGlobalStats } from '@/features/dashboard/components/DashboardGlobalStats'
import { LiveSubscribers } from '@/features/dashboard/components/LiveSubscribers'
import { TopicSection } from '@/features/dashboard/components/TopicSection'
import { WeeklyPublicationsPanel } from '@/features/dashboard/components/WeeklyPublicationsPanel'
import {
  AddPublicationDialog,
  type NewPublicationInput,
  type StageOption,
} from '@/features/dashboard/components/AddPublicationDialog'
import {
  DASHBOARD_NAV,
  pageSubtitleKey,
  pageTitleKey,
} from '@/features/dashboard/lib/nav'
import { AddTopicDialog } from '@/features/topics/components/AddTopicDialog'
import { FirstTopicEmptyState } from '@/features/topics/components/FirstTopicEmptyState'
import { TopicsSection } from '@/features/topics/components/TopicsSection'
import {
  filterTopics,
  formatTopicsFilterPeriod,
} from '@/features/topics/lib/topic-filters'
import { EMPTY_DATE_RANGE } from '@/features/calendar/lib/calendar-utils'
import { useCreatePublicationMutation } from '@/app/api/baseApi'
import { aggregateAll, toTopicViews, type TopicView } from '@/lib/dashboard-utils'
import { getProviderUi } from '@/lib/providers'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

/** Временно отключено — вернуть true, когда таблица будет готова */
const TABLE_VIEW_ENABLED = false

export function ContentGridPage() {
  const { t } = useTranslation()
  const {
    subscriberSources,
    weeklyPublications,
    connectingId,
    onConnectOAuth,
    onYouTubeChannelAdded,
  } = useDashboardShell()
  const {
    sourceTopics,
    isLoading,
    isError,
    refetch,
    handleCreateTopic,
    isCreatingTopic,
    handleCreateStage,
    isCreatingStage,
    handleReorderStages,
    handleUpdateStage,
    handleReorderPublications,
    handleUpdatePublicationLabel,
  } = useDashboardTopicsContext()
  const [createPublication, { isLoading: isCreatingPublication }] =
    useCreatePublicationMutation()

  const hasTopics = sourceTopics.length > 0
  const totals = aggregateAll(sourceTopics)

  const [view, setView] = useState<'cards' | 'table'>('cards')
  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [topicDialogOpen, setTopicDialogOpen] = useState(false)
  const [defaultStageKey, setDefaultStageKey] = useState<string | undefined>()
  const [topics, setTopics] = useState<TopicView[]>(() => toTopicViews(sourceTopics))
  const [dateRange, setDateRange] = useState(EMPTY_DATE_RANGE)

  useEffect(() => {
    setTopics(toTopicViews(sourceTopics))
  }, [sourceTopics])

  const stageOptions: StageOption[] = topics.flatMap((topic) =>
    topic.stages.map((stage) => ({
      topicId: topic.id,
      topicName: topic.name,
      stageId: stage.id,
      stageName: stage.name,
    })),
  )

  const filteredTopics = useMemo(() => {
    const matchedIds = new Set(
      filterTopics(sourceTopics, { query, dateRange }).map((topic) => topic.id),
    )
    return topics.filter((topic) => matchedIds.has(topic.id))
  }, [topics, sourceTopics, query, dateRange])

  const periodLabel = formatTopicsFilterPeriod(dateRange)

  function openDialogForStage(topicId: string, stageId: string) {
    setDefaultStageKey(`${topicId}::${stageId}`)
    setDialogOpen(true)
  }

  function openDialogGlobal() {
    setDefaultStageKey(undefined)
    setDialogOpen(true)
  }

  async function handleAddPublication(
    _topicId: string,
    input: NewPublicationInput,
  ) {
    const provider = getProviderUi(input.providerId)
    const trimmedUrl = input.url.trim()

    await createPublication({
      stageId: input.stageId,
      provider: provider.provider,
      channelName: input.channelName,
      label: input.label,
      postUrl: trimmedUrl || undefined,
      status:
        input.status === 'published'
          ? PublicationStatus.PUBLISHED
          : PublicationStatus.PLANNED,
      metricTrackingMode:
        input.metricTrackingMode ?? MetricTrackingMode.MANUAL,
      initialMetrics: input.metrics,
    }).unwrap()
  }

  function handleMetricsSaved(
    publicationId: string,
    metrics: { likes: number; comments: number },
    historyEntry: MetricHistoryEntryDto,
  ) {
    setTopics((prev) =>
      prev.map((topic) => ({
        ...topic,
        stages: topic.stages.map((stage) => ({
          ...stage,
          publications: stage.publications.map((publication) =>
            publication.id === publicationId
              ? {
                  ...publication,
                  metrics: {
                    ...publication.metrics,
                    likes: metrics.likes,
                    comments: metrics.comments,
                  },
                  metricDeltas: {
                    views: publication.metricDeltas.views,
                    likes: publication.metricDeltas.likes + historyEntry.likesDelta,
                    comments:
                      publication.metricDeltas.comments + historyEntry.commentsDelta,
                  },
                  metricHistory: [
                    historyEntry,
                    ...(publication.metricHistory ?? []),
                  ],
                }
              : publication,
          ),
        })),
      })),
    )
  }

  function reorderTopicStages(topicId: string, stageIds: string[]) {
    setTopics((prev) =>
      prev.map((topic) => {
        if (topic.id !== topicId) {
          return topic
        }

        const stageMap = new Map(topic.stages.map((stage) => [stage.id, stage]))
        return {
          ...topic,
          stages: stageIds
            .map((id) => stageMap.get(id))
            .filter((stage): stage is NonNullable<typeof stage> => stage != null),
        }
      }),
    )

    void handleReorderStages(topicId, stageIds).catch(() => {
      setTopics(toTopicViews(sourceTopics))
    })
  }

  function updateTopicStage(
    topicId: string,
    stageId: string,
    input: { name?: string; hint?: string | null },
  ) {
    setTopics((prev) =>
      prev.map((topic) => {
        if (topic.id !== topicId) {
          return topic
        }

        return {
          ...topic,
          stages: topic.stages.map((stage) =>
            stage.id === stageId
              ? {
                  ...stage,
                  ...(input.name !== undefined ? { name: input.name } : {}),
                  ...(input.hint !== undefined ? { hint: input.hint ?? '' } : {}),
                }
              : stage,
          ),
        }
      }),
    )

    void handleUpdateStage(topicId, stageId, input).catch(() => {
      setTopics(toTopicViews(sourceTopics))
    })
  }

  function updatePublicationLabel(publicationId: string, label: string) {
    setTopics((prev) =>
      prev.map((topic) => ({
        ...topic,
        stages: topic.stages.map((stage) => ({
          ...stage,
          publications: stage.publications.map((publication) =>
            publication.id === publicationId
              ? { ...publication, label }
              : publication,
          ),
        })),
      })),
    )

    void handleUpdatePublicationLabel(publicationId, label).catch(() => {
      setTopics(toTopicViews(sourceTopics))
    })
  }

  function reorderStagePublications(
    topicId: string,
    stageId: string,
    publicationIds: string[],
  ) {
    setTopics((prev) =>
      prev.map((topic) => {
        if (topic.id !== topicId) {
          return topic
        }

        return {
          ...topic,
          stages: topic.stages.map((stage) => {
            if (stage.id !== stageId) {
              return stage
            }

            const publicationMap = new Map(
              stage.publications.map((publication) => [publication.id, publication]),
            )

            return {
              ...stage,
              publications: publicationIds
                .map((id) => publicationMap.get(id))
                .filter(
                  (publication): publication is NonNullable<typeof publication> =>
                    publication != null,
                ),
            }
          }),
        }
      }),
    )

    void handleReorderPublications(topicId, stageId, publicationIds).catch(() => {
      setTopics(toTopicViews(sourceTopics))
    })
  }

  return (
    <>
      <header className="sticky top-0 z-20 flex flex-col gap-4 border-b border-border bg-background/80 px-4 py-4 backdrop-blur-xl md:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {t(pageTitleKey(DASHBOARD_NAV.content))}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(pageSubtitleKey(DASHBOARD_NAV.content))}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {TABLE_VIEW_ENABLED && hasTopics ? (
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
          ) : null}

          {hasTopics ? (
            <>
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
                <span className="hidden sm:inline">
                  {t('dashboard.addPublication')}
                </span>
              </Button>
            </>
          ) : null}
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-6">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : isError ? (
          <section className="overflow-hidden rounded-xl border border-border bg-card px-4 py-10 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">
              {t('dashboard.emptyTopics.loadError')}
            </p>
            <Button className="mt-4" variant="outline" onClick={() => void refetch()}>
              {t('dashboard.emptyTopics.retry')}
            </Button>
          </section>
        ) : !hasTopics ? (
          <>
            <section className="overflow-hidden rounded-2xl border border-primary/15 bg-card shadow-sm">
              <FirstTopicEmptyState onCreateTopic={() => setTopicDialogOpen(true)} />
            </section>

            <LiveSubscribers
              sources={subscriberSources}
              connectingId={connectingId}
              onConnectOAuth={onConnectOAuth}
              onYouTubeChannelAdded={onYouTubeChannelAdded}
            />
          </>
        ) : (
          <>
            <LiveSubscribers
              sources={subscriberSources}
              connectingId={connectingId}
              onConnectOAuth={onConnectOAuth}
              onYouTubeChannelAdded={onYouTubeChannelAdded}
            />

            <DashboardGlobalStats
              views={totals.views}
              comments={totals.comments}
              likes={totals.likes}
              activeTopics={sourceTopics.length}
            />

            <WeeklyPublicationsPanel publications={weeklyPublications} />

            {TABLE_VIEW_ENABLED && view === 'table' ? (
              <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <ContentMetricsTable
                  topics={sourceTopics}
                  onAddPublication={openDialogForStage}
                />
              </section>
            ) : (
              <TopicsSection
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                onClearDateRange={() => setDateRange(EMPTY_DATE_RANGE)}
                onAddTopic={() => setTopicDialogOpen(true)}
                empty={
                  filteredTopics.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                      {dateRange.enabled
                        ? `Нет тем за ${periodLabel}${query ? ` по запросу «${query}»` : ''}`
                        : `Ничего не найдено по запросу «${query}»`}
                    </div>
                  ) : undefined
                }
              >
                {filteredTopics.map((topic) => (
                  <TopicSection
                    key={topic.id}
                    topic={topic}
                    nested
                    onAddPublication={openDialogForStage}
                    onMetricsSaved={handleMetricsSaved}
                    onCreateStage={handleCreateStage}
                    onReorderStages={reorderTopicStages}
                    onUpdateStage={updateTopicStage}
                    onUpdatePublicationLabel={updatePublicationLabel}
                    onReorderPublications={reorderStagePublications}
                    isCreatingStage={isCreatingStage}
                  />
                ))}
              </TopicsSection>
            )}
          </>
        )}
      </main>

      <AddPublicationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        stageOptions={stageOptions}
        defaultStageKey={defaultStageKey}
        onSubmit={handleAddPublication}
        isSubmitting={isCreatingPublication}
      />

      <AddTopicDialog
        open={topicDialogOpen}
        onOpenChange={setTopicDialogOpen}
        onSubmit={handleCreateTopic}
        isSubmitting={isCreatingTopic}
      />
    </>
  )
}
