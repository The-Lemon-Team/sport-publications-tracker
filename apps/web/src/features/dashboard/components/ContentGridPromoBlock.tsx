import { ArrowRight, LayoutGrid } from 'lucide-react'

import { useTranslation } from 'react-i18next'

import { Link } from 'react-router-dom'

import { useDashboardTopicsContext } from '@/features/dashboard/DashboardTopicsProvider'

import {

  DASHBOARD_NAV,

  DASHBOARD_PATHS,

} from '@/features/dashboard/lib/nav'

import { cn } from '@/lib/utils'



export function ContentGridPromoBlock() {

  const { t } = useTranslation()

  const { sourceTopics } = useDashboardTopicsContext()

  const hasTopics = sourceTopics.length > 0



  return (
    <Link
      to={DASHBOARD_PATHS[DASHBOARD_NAV.content]}
      className={cn(

        'group relative block overflow-hidden rounded-2xl border border-primary/20',

        'bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm md:p-10',

        'transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5',

        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',

      )}

    >

      <div

        aria-hidden

        className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-primary/5 blur-2xl transition-opacity group-hover:bg-primary/10"

      />



      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

        <div className="flex min-w-0 items-start gap-4 md:gap-6">

          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20 transition-transform group-hover:scale-105 md:size-16">

            <LayoutGrid className="size-7 md:size-8" />

          </span>

          <div className="min-w-0">

            <h2 className="text-xl font-semibold tracking-tight md:text-2xl lg:text-3xl">

              {hasTopics

                ? t('dashboard.contentGridPromo.title')

                : t('dashboard.contentGridPromo.emptyTitle')}

            </h2>

            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">

              {hasTopics

                ? t('dashboard.contentGridPromo.description')

                : t('dashboard.contentGridPromo.emptyDescription')}

            </p>

          </div>

        </div>



        <span

          className={cn(

            'inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl',

            'bg-primary px-5 py-3 text-sm font-medium text-primary-foreground',

            'transition-transform group-hover:translate-x-0.5 md:self-center',

          )}

        >

          {hasTopics

            ? t('dashboard.contentGridPromo.action')

            : t('dashboard.contentGridPromo.emptyAction')}

          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />

        </span>

      </div>

    </Link>

  )

}


