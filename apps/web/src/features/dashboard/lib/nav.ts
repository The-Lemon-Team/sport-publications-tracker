export const DASHBOARD_NAV = {
  content: 'Контент-сетка',
  broadcasts: 'Эфиры',
  analytics: 'Аналитика',
  calendar: 'Календарь',
  team: 'Команда',
  achievements: 'Достижения',
  settings: 'Настройки',
} as const

export type DashboardNavItem =
  (typeof DASHBOARD_NAV)[keyof typeof DASHBOARD_NAV]

export const UNDER_DEVELOPMENT_PAGES: DashboardNavItem[] = [
  DASHBOARD_NAV.broadcasts,
  DASHBOARD_NAV.analytics,
  DASHBOARD_NAV.team,
  DASHBOARD_NAV.achievements,
]

export const PAGE_TITLES: Record<DashboardNavItem, { title: string; subtitle: string }> = {
  [DASHBOARD_NAV.content]: {
    title: 'Content Metrics',
    subtitle: 'Трекинг публикаций по темам, этапам и площадкам',
  },
  [DASHBOARD_NAV.broadcasts]: {
    title: 'Эфиры',
    subtitle: 'Управление прямыми трансляциями',
  },
  [DASHBOARD_NAV.analytics]: {
    title: 'Аналитика',
    subtitle: 'Сводная аналитика по площадкам',
  },
  [DASHBOARD_NAV.calendar]: {
    title: 'Календарь',
    subtitle: 'Публикации по датам',
  },
  [DASHBOARD_NAV.team]: {
    title: 'Команда',
    subtitle: 'Участники и роли',
  },
  [DASHBOARD_NAV.achievements]: {
    title: 'Достижения',
    subtitle: 'Цели и прогресс сезона',
  },
  [DASHBOARD_NAV.settings]: {
    title: 'Настройки',
    subtitle: 'Профиль и параметры аккаунта',
  },
}
