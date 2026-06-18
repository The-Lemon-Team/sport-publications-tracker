import {
  MetricSnapshotKind,
  type MetricSnapshotDto,
  type Metrics,
  type PublicationDto,
  type PublicationStatus,
  type StageDto,
  type TopicDto,
} from '@spt/shared'

export type ContentRowKind = 'topic' | 'stage' | 'publication'

export interface ContentTableRow {
  id: string
  kind: ContentRowKind
  depth: number
  topicId: string
  stageId?: string
  publicationId?: string
  name: string
  subtitle?: string
  status?: PublicationStatus
  provider?: PublicationDto['provider']
  channelName?: string
  metrics: Metrics
  publishedCount?: number
  totalCount?: number
  childCount?: number
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)}K`
  }
  return value.toLocaleString('ru-RU')
}

export function engagementRate(metrics: Metrics): string {
  if (metrics.views <= 0) return '—'
  return `${(((metrics.likes + metrics.comments) / metrics.views) * 100).toFixed(1)}%`
}

const emptyMetrics = (): Metrics => ({
  views: 0,
  likes: 0,
  comments: 0,
  shares: 0,
})

export function getSnapshot(
  snapshots: MetricSnapshotDto[],
  kind: MetricSnapshotKind = MetricSnapshotKind.LIVE,
): MetricSnapshotDto | undefined {
  return snapshots.find((s) => s.kind === kind)
}

export function snapshotToMetrics(snapshot?: MetricSnapshotDto): Metrics {
  if (!snapshot) return emptyMetrics()
  return {
    views: snapshot.views,
    likes: snapshot.likes,
    comments: snapshot.comments,
    shares: snapshot.shares,
  }
}

export function sumMetrics(a: Metrics, b: Metrics): Metrics {
  return {
    views: a.views + b.views,
    likes: a.likes + b.likes,
    comments: a.comments + b.comments,
    shares: a.shares + b.shares,
  }
}

export function aggregatePublication(publication: PublicationDto): Metrics {
  const live = getSnapshot(publication.snapshots, MetricSnapshotKind.LIVE)
  const atPublish = getSnapshot(publication.snapshots, MetricSnapshotKind.AT_PUBLISH)
  return snapshotToMetrics(live ?? atPublish)
}

export function aggregateStage(stage: StageDto): Metrics {
  return stage.publications.reduce(
    (acc, pub) => sumMetrics(acc, aggregatePublication(pub)),
    emptyMetrics(),
  )
}

export function aggregateTopic(topic: TopicDto): Metrics {
  return topic.stages.reduce(
    (acc, stage) => sumMetrics(acc, aggregateStage(stage)),
    emptyMetrics(),
  )
}

export function countPublications(topic: TopicDto): {
  published: number
  total: number
} {
  let published = 0
  let total = 0
  for (const stage of topic.stages) {
    for (const pub of stage.publications) {
      total += 1
      if (pub.status === 'PUBLISHED') published += 1
    }
  }
  return { published, total }
}

export function flattenTopicsToRows(topics: TopicDto[]): ContentTableRow[] {
  const rows: ContentTableRow[] = []

  for (const topic of topics) {
    const counts = countPublications(topic)
    rows.push({
      id: `topic-${topic.id}`,
      kind: 'topic',
      depth: 0,
      topicId: topic.id,
      name: topic.name,
      metrics: aggregateTopic(topic),
      publishedCount: counts.published,
      totalCount: counts.total,
      childCount: topic.stages.length,
    })

    for (const stage of topic.stages) {
      rows.push({
        id: `stage-${topic.id}-${stage.id}`,
        kind: 'stage',
        depth: 1,
        topicId: topic.id,
        stageId: stage.id,
        name: stage.name,
        subtitle: stage.hint ?? undefined,
        metrics: aggregateStage(stage),
        childCount: stage.publications.length,
      })

      for (const publication of stage.publications) {
        rows.push({
          id: `pub-${publication.id}`,
          kind: 'publication',
          depth: 2,
          topicId: topic.id,
          stageId: stage.id,
          publicationId: publication.id,
          name: publication.label ?? publication.channelName,
          channelName: publication.channelName,
          provider: publication.provider,
          status: publication.status,
          metrics: aggregatePublication(publication),
        })
      }
    }
  }

  return rows
}
