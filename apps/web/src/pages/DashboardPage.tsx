import { Routes, Route } from 'react-router-dom'
import { DashboardLayout } from '@/features/dashboard/DashboardLayout'
import { ContentGridRoute } from '@/features/dashboard/pages/ContentGridRoute'
import { HomeRoute } from '@/features/dashboard/pages/HomeRoute'
import {
  CalendarPage,
  SettingsPage,
  UnderDevelopmentPage,
} from '@/features/dashboard/pages/DashboardPages'
import {
  DASHBOARD_PATHS,
  UNDER_DEVELOPMENT_PAGES,
} from '@/features/dashboard/lib/nav'
import { TopicsPage } from '@/features/topics/TopicsPage'

export function DashboardPage() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<HomeRoute />} />
        <Route path="content" element={<ContentGridRoute />} />
        <Route path="topics" element={<TopicsPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="settings" element={<SettingsPage />} />
        {UNDER_DEVELOPMENT_PAGES.map((nav) => (
          <Route
            key={nav}
            path={DASHBOARD_PATHS[nav].slice(1)}
            element={<UnderDevelopmentPage navId={nav} />}
          />
        ))}
      </Route>
    </Routes>
  )
}
