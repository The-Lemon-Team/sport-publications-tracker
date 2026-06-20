import type { Metrics, TopicDto } from '@spt/shared'
import {
  MetricSnapshotKind,
  MetricTrackingMode,
  PublicationStatus,
  type MetricHistoryEntryDto,
  type PublicationDto,
} from '@spt/shared'
import {
  aggregateTopic,
  getSnapshot,
  snapshotToMetrics,
} from '@/features/content-table/lib/metrics'
import { providerIdFromEnum } from '@/lib/providers'

export type DashboardMetrics = Pick<Metrics, 'views' | 'likes' | 'comments'>

export function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)}K`
  }
  return value.toLocaleString('ru-RU')
}

export function formatSubscriberDate(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function sumMetrics(
  a: DashboardMetrics,
  b: DashboardMetrics,
): DashboardMetrics {
  return {
    views: a.views + b.views,
    likes: a.likes + b.likes,
    comments: a.comments + b.comments,
  }
}

function toDashboardMetrics(m: Metrics): DashboardMetrics {
  return { views: m.views, likes: m.likes, comments: m.comments }
}

export function aggregateAll(topics: TopicDto[]): DashboardMetrics {
  return topics.reduce(
    (acc, topic) => sumMetrics(acc, toDashboardMetrics(aggregateTopic(topic))),
    { views: 0, likes: 0, comments: 0 },
  )
}

export type PublicationViewStatus = 'published' | 'scheduled' | 'missing'

export interface PublicationView {
  id: string
  providerId: string
  label: string
  stageId: string
  url: string
  status: PublicationViewStatus
  metricTrackingMode: PublicationDto['metricTrackingMode']
  metrics: DashboardMetrics
  metricDeltas: { views: number; likes: number; comments: number }
  /** Significant negative deltas from recent live→manual transition. */
  highlightMetricDeltas?: {
    views: number
    likes: number
    comments: number
  } | null
  metricHistory?: MetricHistoryEntryDto[]
}

export interface StageView {
  id: string
  name: string
  hint: string
  publications: PublicationView[]
}

export interface TopicView {
  id: string
  name: string
  translation: string
  category: string
  createdAt: string
  stages: StageView[]
}

function computeMetricDeltas(
  current: DashboardMetrics,
  atPublish: ReturnType<typeof snapshotToMetrics> | undefined,
): { views: number; likes: number; comments: number } {
  if (!atPublish) {
    return { views: 0, likes: 0, comments: 0 }
  }
  return {
    views: current.views - atPublish.views,
    likes: current.likes - atPublish.likes,
    comments: current.comments - atPublish.comments,
  }
}

function toPublicationView(pub: PublicationDto, stageId: string): PublicationView {
  const liveSnapshot = getSnapshot(pub.snapshots, MetricSnapshotKind.LIVE)
  const atPublishSnapshot = getSnapshot(pub.snapshots, MetricSnapshotKind.AT_PUBLISH)
  const metrics = toDashboardMetrics(
    snapshotToMetrics(liveSnapshot ?? atPublishSnapshot),
  )
  const metricDeltas = computeMetricDeltas(
    metrics,
    atPublishSnapshot ? snapshotToMetrics(atPublishSnapshot) : undefined,
  )

  let status: PublicationViewStatus = 'scheduled'
  if (pub.status === PublicationStatus.PUBLISHED) status = 'published'

  return {
    id: pub.id,
    providerId: providerIdFromEnum(pub.provider),
    label: pub.label ?? pub.channelName,
    stageId,
    url: pub.postUrl ?? '',
    status,
    metricTrackingMode:
      pub.metricTrackingMode ?? MetricTrackingMode.MANUAL,
    metrics,
    metricDeltas,
    highlightMetricDeltas: pub.highlightMetricDeltas ?? null,
  }
}

export function toTopicViews(topics: TopicDto[]): TopicView[] {
  return topics.map((topic) => ({
    id: topic.id,
    name: topic.name,
    translation: '',
    category: 'Контент',
    createdAt: topic.createdAt,
    stages: topic.stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      hint: stage.hint ?? '',
      publications: stage.publications.map((pub) =>
        toPublicationView(pub, stage.id),
      ),
    })),
  }))
}

export function aggregateStageView(stage: StageView): DashboardMetrics {
  return stage.publications.reduce(
    (acc, pub) => sumMetrics(acc, pub.metrics),
    { views: 0, likes: 0, comments: 0 },
  )
}

export function aggregateTopicView(topic: TopicView): DashboardMetrics {
  return topic.stages.reduce(
    (acc, stage) => sumMetrics(acc, aggregateStageView(stage)),
    { views: 0, likes: 0, comments: 0 },
  )
}

export function countPublicationViews(topic: TopicView): {
  total: number
  published: number
} {
  let total = 0
  let published = 0
  for (const stage of topic.stages) {
    for (const pub of stage.publications) {
      total += 1
      if (pub.status === 'published') published += 1
    }
  }
  return { total, published }
}

