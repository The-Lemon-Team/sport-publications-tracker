import { UnderDevelopment } from '@/components/UnderDevelopment'
import { CalendarView } from '@/features/calendar/CalendarView'
import { useDashboardTopicsContext } from '@/features/dashboard/DashboardTopicsProvider'
import { SettingsView } from '@/features/settings/SettingsView'
import type { DashboardNavId } from '@/features/dashboard/lib/nav'

export function CalendarPage() {
  const { sourceTopics } = useDashboardTopicsContext()
  return <CalendarView topics={sourceTopics} />
}

export function SettingsPage() {
  return <SettingsView />
}

export function UnderDevelopmentPage({ navId }: { navId: DashboardNavId }) {
  return <UnderDevelopment navId={navId} />
}
