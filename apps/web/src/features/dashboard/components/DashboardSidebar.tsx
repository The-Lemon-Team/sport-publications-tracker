import * as React from 'react'
import {
  BarChart3,
  CalendarDays,
  LayoutGrid,
  LogOut,
  Radio,
  Settings,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { logout, selectAuthUser } from '@/features/auth/authSlice'
import { Button } from '@/components/ui/button'

type NavItem = {
  label: string
  icon: LucideIcon
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'Workspace',
    items: [
      { label: 'Контент-сетка', icon: LayoutGrid },
      { label: 'Эфиры', icon: Radio },
      { label: 'Аналитика', icon: BarChart3 },
      { label: 'Календарь', icon: CalendarDays },
    ],
  },
  {
    section: 'Agency',
    items: [
      { label: 'Команда', icon: Users },
      { label: 'Достижения', icon: Trophy },
      { label: 'Настройки', icon: Settings },
    ],
  },
]

export function DashboardSidebar() {
  const user = useSelector(selectAuthUser)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [active, setActive] = React.useState('Контент-сетка')

  function handleLogout() {
    dispatch(logout())
    navigate('/login', { replace: true })
  }

  return (
    <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar/80 p-4 text-sidebar-foreground backdrop-blur-xl lg:flex">
      <div className="flex items-center gap-2.5 px-2 pt-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
          <Trophy className="size-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Studio S10</p>
          <p className="text-xs text-sidebar-foreground/60">Sports Content</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto">
        {NAV.map((group) => (
          <div key={group.section} className="flex flex-col gap-1">
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              {group.section}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon
              const isActive = active === item.label
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setActive(item.label)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-sidebar-border'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {isActive ? (
                    <span className="size-1.5 rounded-full bg-sidebar-primary" />
                  ) : null}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="space-y-3">
        <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-3 backdrop-blur">
          <p className="text-xs font-medium">Сезон 2026</p>
          <p className="mt-0.5 truncate text-[11px] text-sidebar-foreground/60">
            {user?.email}
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-sidebar-foreground/15">
            <div className="h-full w-[78%] rounded-full bg-sidebar-primary" />
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          Выйти
        </Button>
      </div>
    </aside>
  )
}
