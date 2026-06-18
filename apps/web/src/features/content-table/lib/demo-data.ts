import {
  MetricSnapshotKind,
  Provider,
  PublicationStatus,
  type TopicDto,
} from '@spt/shared'

const m = (
  views: number,
  likes: number,
  comments: number,
  shares = 0,
) => ({
  kind: MetricSnapshotKind.LIVE,
  views,
  likes,
  comments,
  shares,
  capturedAt: new Date().toISOString(),
})

/** Demo data mirroring Excel structure: Topic → Stage → Publication */
export const DEMO_TOPICS: TopicDto[] = [
  {
    id: 'topic-sleep',
    name: 'Сон',
    order: 0,
    stages: [
      {
        id: 'stage-anons',
        name: 'Анонс эфира',
        hint: 'Pre-stream announcements',
        order: 0,
        publications: [
          {
            id: 'pub-1',
            provider: Provider.TELEGRAM,
            channelName: 'S10',
            label: 'ТГ S10 (пост)',
            postUrl: 'https://t.me/s10/101',
            status: PublicationStatus.PUBLISHED,
            publishedAt: '2026-01-13T00:00:00.000Z',
            order: 0,
            snapshots: [m(678, 42, 0)],
          },
          {
            id: 'pub-2',
            provider: Provider.VK,
            channelName: 'S10',
            label: 'VK S10 пост',
            postUrl: 'https://vk.com/s10',
            status: PublicationStatus.PUBLISHED,
            publishedAt: '2026-01-13T00:00:00.000Z',
            order: 1,
            snapshots: [m(8657, 214, 9)],
          },
          {
            id: 'pub-3',
            provider: Provider.VK,
            channelName: 'Юрий',
            label: 'VK Юрий (пост)',
            postUrl: 'https://vk.com/yuri',
            status: PublicationStatus.PUBLISHED,
            publishedAt: '2026-01-13T00:00:00.000Z',
            order: 2,
            snapshots: [m(12294, 162, 25)],
          },
        ],
      },
      {
        id: 'stage-live',
        name: 'Эфир (live)',
        hint: 'Live broadcast',
        order: 1,
        publications: [
          {
            id: 'pub-4',
            provider: Provider.YOUTUBE,
            channelName: 'S10',
            label: 'YouTube S10',
            postUrl: 'https://youtube.com/watch?v=abc',
            status: PublicationStatus.PUBLISHED,
            publishedAt: '2026-01-19T00:00:00.000Z',
            order: 0,
            snapshots: [m(2617, 135, 0)],
          },
        ],
      },
      {
        id: 'stage-shorts',
        name: 'Нарезки (shorts / reels)',
        hint: '6 штук',
        order: 2,
        publications: [
          {
            id: 'pub-5',
            provider: Provider.INSTAGRAM,
            channelName: 'S10',
            label: 'Инста S10',
            postUrl: 'https://instagram.com/reel/x',
            status: PublicationStatus.PUBLISHED,
            publishedAt: null,
            order: 0,
            snapshots: [m(7042, 135, 0)],
          },
        ],
      },
    ],
  },
  {
    id: 'topic-womens-running',
    name: 'Женский бег 1 часть',
    order: 1,
    stages: [
      {
        id: 'stage-anons-2',
        name: 'Анонс эфира',
        hint: null,
        order: 0,
        publications: [
          {
            id: 'pub-6',
            provider: Provider.TELEGRAM,
            channelName: 'S10',
            label: 'ТГ S10',
            postUrl: 'https://t.me/s10/201',
            status: PublicationStatus.PUBLISHED,
            publishedAt: '2026-01-25T00:00:00.000Z',
            order: 0,
            snapshots: [m(48, 0, 0)],
          },
        ],
      },
      {
        id: 'stage-live-2',
        name: 'Эфир (live)',
        hint: null,
        order: 1,
        publications: [
          {
            id: 'pub-7',
            provider: Provider.YOUTUBE,
            channelName: 'S10',
            label: 'YouTube S10',
            postUrl: 'https://youtube.com/watch?v=run',
            status: PublicationStatus.PUBLISHED,
            publishedAt: '2026-01-26T00:00:00.000Z',
            order: 0,
            snapshots: [m(1152, 160, 6)],
          },
        ],
      },
    ],
  },
]
