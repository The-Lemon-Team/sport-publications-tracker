import { useDashboardShell } from '@/features/dashboard/DashboardShellContext'
import { HomePage } from '@/features/dashboard/pages/HomePage'

export function HomeRoute() {
  const { oauthError } = useDashboardShell()

  return (
    <>
      {oauthError ? (
        <div className="border-b border-border bg-destructive/5 px-4 py-2 text-center text-sm text-destructive md:px-6">
          {oauthError}
        </div>
      ) : null}
      <HomePage />
    </>
  )
}
