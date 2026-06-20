import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Eye,
  MessageCircle,
  ThumbsUp,
  TrendingUp,
} from 'lucide-react'
import { formatNumber } from '@/lib/dashboard-utils'

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

export function DashboardGlobalStats({
  views,
  comments,
  likes,
  activeTopics,
}: {
  views: number
  comments: number
  likes: number
  activeTopics: number
}) {
  const { t } = useTranslation()

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <GlobalStat
        label={t('dashboard.stats.totalViews')}
        value={formatNumber(views)}
        icon={Eye}
      />
      <GlobalStat
        label={t('dashboard.stats.totalComments')}
        value={formatNumber(comments)}
        icon={MessageCircle}
      />
      <GlobalStat
        label={t('dashboard.stats.totalLikes')}
        value={formatNumber(likes)}
        icon={ThumbsUp}
      />
      <GlobalStat
        label={t('dashboard.stats.activeTopics')}
        value={String(activeTopics)}
        icon={TrendingUp}
      />
    </section>
  )
}
