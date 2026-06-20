import { ArrowRight, Instagram, LayoutGrid, Loader2, Youtube } from 'lucide-react'

import { useTranslation } from 'react-i18next'

import { useNavigate } from 'react-router-dom'

import { useGetOAuthConnectionsQuery } from '@/app/api/baseApi'

import { useDashboardShell } from '@/features/dashboard/DashboardShellContext'

import { useDashboardTopicsContext } from '@/features/dashboard/DashboardTopicsProvider'

import {

  DASHBOARD_NAV,

  DASHBOARD_PATHS,

} from '@/features/dashboard/lib/nav'

import { getProviderUi } from '@/lib/providers'

import { Button } from '@/components/ui/button'



interface NextStep {

  id: string

  title: string

  description: string

  providerId?: string

  actionLabel: string

  onAction: () => void

  loading?: boolean

  primary?: boolean

}



export function NextStepsPanel() {

  const { t } = useTranslation()

  const navigate = useNavigate()

  const { subscriberSources, connectingId, onConnectOAuth } =

    useDashboardShell()

  const { sourceTopics } = useDashboardTopicsContext()

  const { data: oauthConnections } = useGetOAuthConnectionsQuery()



  const hasTopics = sourceTopics.length > 0

  const hasInstagramOAuth = oauthConnections?.some(

    (connection) =>

      connection.status === 'ACTIVE' && connection.provider === 'FACEBOOK',

  )

  const hasYouTubeSource = subscriberSources.some(

    (source) => source.providerId === 'youtube' && source.sourceId,

  )



  const steps: NextStep[] = []



  if (!hasTopics) {

    steps.push({

      id: 'create-first-topic',

      title: t('dashboard.nextSteps.firstTopic.title'),

      description: t('dashboard.nextSteps.firstTopic.description'),

      actionLabel: t('dashboard.nextSteps.firstTopic.action'),

      primary: true,

      onAction: () => navigate(DASHBOARD_PATHS[DASHBOARD_NAV.content]),

    })

  }



  if (!hasInstagramOAuth) {

    steps.push({

      id: 'connect-instagram',

      title: t('dashboard.nextSteps.instagram.title'),

      description: t('dashboard.nextSteps.instagram.description'),

      providerId: 'instagram',

      actionLabel: t('dashboard.nextSteps.instagram.action'),

      onAction: () => onConnectOAuth('instagram'),

      loading: connectingId === 'instagram',

    })

  }



  if (!hasYouTubeSource) {

    steps.push({

      id: 'add-youtube',

      title: t('dashboard.nextSteps.youtube.title'),

      description: t('dashboard.nextSteps.youtube.description'),

      providerId: 'youtube',

      actionLabel: t('dashboard.nextSteps.youtube.action'),

      onAction: () => {

        document

          .getElementById('live-subscribers')

          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })

      },

    })

  }



  if (steps.length === 0) {

    return (

      <section className="rounded-xl border border-border bg-card p-4 md:p-5">

        <h2 className="text-sm font-semibold tracking-tight">

          {t('dashboard.nextSteps.title')}

        </h2>

        <p className="mt-2 text-sm text-muted-foreground">

          {t('dashboard.nextSteps.allDone')}

        </p>

      </section>

    )

  }



  return (

    <section className="rounded-xl border border-border bg-card p-4 md:p-5">

      <div className="mb-4">

        <h2 className="text-sm font-semibold tracking-tight">

          {t('dashboard.nextSteps.title')}

        </h2>

        <p className="mt-1 text-xs text-muted-foreground">

          {t('dashboard.nextSteps.subtitle')}

        </p>

      </div>



      <ul className="flex flex-col gap-3">

        {steps.map((step) => {

          const provider = step.providerId

            ? getProviderUi(step.providerId)

            : null



          return (

            <li

              key={step.id}

              className="flex flex-col gap-3 rounded-lg border border-border/80 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"

            >

              <div className="flex min-w-0 items-start gap-3">

                {provider ? (

                  <span

                    className="flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"

                    style={{ backgroundColor: provider.color }}

                  >

                    {step.providerId === 'instagram' ? (

                      <Instagram className="size-4" />

                    ) : step.providerId === 'youtube' ? (

                      <Youtube className="size-4" />

                    ) : (

                      provider.abbr

                    )}

                  </span>

                ) : (

                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">

                    <LayoutGrid className="size-4" />

                  </span>

                )}

                <div className="min-w-0">

                  <p className="text-sm font-medium">{step.title}</p>

                  <p className="mt-0.5 text-xs text-muted-foreground">

                    {step.description}

                  </p>

                </div>

              </div>

              <Button

                size="sm"

                variant={

                  step.primary || step.id === 'connect-instagram'

                    ? 'default'

                    : 'outline'

                }

                className="shrink-0 self-start sm:self-center"

                disabled={step.loading}

                onClick={step.onAction}

              >

                {step.loading ? (

                  <Loader2 className="size-4 animate-spin" />

                ) : (

                  <ArrowRight className="size-4" />

                )}

                {step.actionLabel}

              </Button>

            </li>

          )

        })}

      </ul>

    </section>

  )

}


