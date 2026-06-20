import { Construction } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { navLabelKey, type DashboardNavId } from '@/features/dashboard/lib/nav'

export function UnderDevelopment({ navId }: { navId: DashboardNavId }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Construction className="size-8" />
      </span>
      <div className="max-w-md space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">
          {t(navLabelKey(navId))}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('underDevelopment.description')}
        </p>
      </div>
    </div>
  )
}
