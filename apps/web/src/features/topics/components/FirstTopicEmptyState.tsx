import { LayoutGrid, Plus, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type FirstTopicEmptyStateProps = {
  onCreateTopic: () => void
  className?: string
  compact?: boolean
}

export function FirstTopicEmptyState({
  onCreateTopic,
  className,
  compact = false,
}: FirstTopicEmptyStateProps) {
  const { t } = useTranslation()
  const steps = t('dashboard.emptyTopics.steps', {
    returnObjects: true,
  }) as string[]

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        compact ? 'px-4 py-8' : 'px-4 py-12 md:px-8 md:py-16',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-primary/5"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-12 size-56 rounded-full bg-primary/5 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
        <span
          className={cn(
            'relative flex items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/25 shadow-lg shadow-primary/10',
            compact ? 'size-14' : 'size-16 md:size-[4.5rem]',
          )}
        >
          <LayoutGrid className={compact ? 'size-7' : 'size-8 md:size-9'} />
          <Sparkles
            aria-hidden
            className="absolute -right-1 -top-1 size-4 text-primary/80 md:size-5"
          />
        </span>

        <div
          className={cn(
            'mt-6 flex max-w-xl flex-col gap-2 md:mt-8',
            compact && 'mt-5 gap-1.5',
          )}
        >
          <h2
            className={cn(
              'font-semibold tracking-tight',
              compact ? 'text-lg' : 'text-2xl md:text-3xl',
            )}
          >
            {t('dashboard.emptyTopics.title')}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            {t('dashboard.emptyTopics.description')}
          </p>
        </div>

        <ol
          className={cn(
            'mt-8 flex w-full max-w-lg flex-col gap-2.5 text-left',
            compact && 'mt-6 gap-2',
          )}
        >
          {steps.map((step, index) => (
            <li
              key={step}
              className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/60 px-3.5 py-3 text-sm shadow-sm backdrop-blur-sm transition-colors hover:border-primary/25 hover:bg-background/80"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/12 font-mono text-xs font-semibold text-primary ring-1 ring-primary/15">
                {index + 1}
              </span>
              <span className="pt-1 text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>

        <Button
          size={compact ? 'default' : 'lg'}
          className={cn(
            'mt-8 shadow-md shadow-primary/15 transition-shadow hover:shadow-lg hover:shadow-primary/20',
            compact && 'mt-6',
          )}
          onClick={onCreateTopic}
        >
          <Plus className="size-4" />
          {t('dashboard.emptyTopics.action')}
        </Button>
      </div>
    </div>
  )
}
