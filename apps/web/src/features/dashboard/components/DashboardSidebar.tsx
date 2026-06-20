import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Home,
  LayoutGrid,
  LogOut,
  Moon,
  Radio,
  Settings,
  Sun,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { logout, selectAuthUser } from '@/features/auth/authSlice'
import { SidebarUserCard } from '@/features/dashboard/components/SidebarUserCard'
import { useSidebarWidth } from '@/features/dashboard/hooks/useSidebarWidth'
import type { SidebarUserStats } from '@/features/dashboard/lib/sidebar-user-stats'
import {
  DASHBOARD_NAV,
  DASHBOARD_PATHS,
  navLabelKey,
  type DashboardNavId,
} from '@/features/dashboard/lib/nav'
import { useTheme } from '@/features/theme/ThemeProvider'
import { BrandMark } from '@/components/BrandMark'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

type NavItem = {
  id: DashboardNavId
  icon: LucideIcon
}

const NAV: { sectionKey: 'nav.section.workspace' | 'nav.section.agency'; items: NavItem[] }[] = [
  {
    sectionKey: 'nav.section.workspace',
    items: [
      { id: DASHBOARD_NAV.home, icon: Home },
      { id: DASHBOARD_NAV.content, icon: LayoutGrid },
      { id: DASHBOARD_NAV.topics, icon: BookOpen },
      { id: DASHBOARD_NAV.broadcasts, icon: Radio },
      { id: DASHBOARD_NAV.analytics, icon: BarChart3 },
      { id: DASHBOARD_NAV.calendar, icon: CalendarDays },
    ],
  },
  {
    sectionKey: 'nav.section.agency',
    items: [
      { id: DASHBOARD_NAV.team, icon: Users },
      { id: DASHBOARD_NAV.achievements, icon: Trophy },
      { id: DASHBOARD_NAV.settings, icon: Settings },
    ],
  },
]

type DashboardSidebarProps = {
  active: DashboardNavId
  userStats: SidebarUserStats
}

export function DashboardSidebar({
  active,
  userStats,
}: DashboardSidebarProps) {
  const { t } = useTranslation()
  const user = useSelector(selectAuthUser)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'
  const { width, isResizing, onResizePointerDown } = useSidebarWidth()

  function handleLogout() {
    dispatch(logout())
    navigate('/login', { replace: true })
  }

  return (
    <div
      className="relative sticky top-0 hidden min-h-svh shrink-0 self-stretch bg-sidebar lg:block"
      style={{ width }}
    >
      <aside
        className={cn(
          'sticky top-0 flex h-svh w-full flex-col gap-4 border-r border-sidebar-border bg-sidebar/80 p-4 text-sidebar-foreground backdrop-blur-xl',
          isResizing && 'select-none',
        )}
      >
        <BrandMark className="px-2 pt-2" />

        {user ? (
          <SidebarUserCard user={user} stats={userStats} />
        ) : null}

        <nav className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
          {NAV.map((group) => (
            <div key={group.sectionKey} className="flex flex-col gap-1">
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {t(group.sectionKey)}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = active === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(DASHBOARD_PATHS[item.id])}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-sidebar-border'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1 truncate">
                      {t(navLabelKey(item.id))}
                    </span>
                    {isActive ? (
                      <span className="size-1.5 rounded-full bg-sidebar-primary" />
                    ) : null}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="shrink-0 space-y-3">
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-3 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <Sun className="size-3.5 shrink-0 text-sidebar-foreground/60" />
              <Switch
                checked={isDark}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                aria-label={t('nav.toggleTheme')}
              />
              <Moon className="size-3.5 shrink-0 text-sidebar-foreground/60" />
            </div>
            <p className="mt-2 text-center text-[10px] text-sidebar-foreground/50">
              {isDark ? t('nav.themeDark') : t('nav.themeLight')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            {t('nav.logout')}
          </Button>
        </div>
      </aside>

      <button
        type="button"
        aria-label="Изменить ширину боковой панели"
        aria-orientation="vertical"
        aria-valuemin={240}
        aria-valuemax={440}
        aria-valuenow={width}
        onPointerDown={onResizePointerDown}
        className={cn(
          'absolute inset-y-0 -right-1 z-20 w-2 cursor-col-resize touch-none',
          'before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-sidebar-border/80',
          'hover:before:bg-sidebar-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary/40',
          isResizing && 'before:bg-sidebar-primary',
        )}
      />
    </div>
  )
}
