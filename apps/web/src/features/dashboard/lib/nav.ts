export const DASHBOARD_NAV = {
  home: 'home',
  content: 'content',
  topics: 'topics',
  broadcasts: 'broadcasts',
  analytics: 'analytics',
  calendar: 'calendar',
  team: 'team',
  achievements: 'achievements',
  settings: 'settings',
} as const

export type DashboardNavId = (typeof DASHBOARD_NAV)[keyof typeof DASHBOARD_NAV]

/** @deprecated Use DashboardNavId */
export type DashboardNavItem = DashboardNavId

export const DASHBOARD_PATHS: Record<DashboardNavId, string> = {
  [DASHBOARD_NAV.home]: '/',
  [DASHBOARD_NAV.content]: '/content',
  [DASHBOARD_NAV.topics]: '/topics',
  [DASHBOARD_NAV.broadcasts]: '/broadcasts',
  [DASHBOARD_NAV.analytics]: '/analytics',
  [DASHBOARD_NAV.calendar]: '/calendar',
  [DASHBOARD_NAV.team]: '/team',
  [DASHBOARD_NAV.achievements]: '/achievements',
  [DASHBOARD_NAV.settings]: '/settings',
}

export function navFromPath(pathname: string): DashboardNavId {
  if (pathname === '/' || pathname === '') {
    return DASHBOARD_NAV.home
  }

  const sorted = Object.entries(DASHBOARD_PATHS).sort(
    ([, a], [, b]) => b.length - a.length,
  )

  for (const [nav, path] of sorted) {
    if (path !== '/' && pathname.startsWith(path)) {
      return nav as DashboardNavId
    }
  }

  return DASHBOARD_NAV.home
}

export const UNDER_DEVELOPMENT_PAGES: DashboardNavId[] = [
  DASHBOARD_NAV.broadcasts,
  DASHBOARD_NAV.analytics,
  DASHBOARD_NAV.team,
  DASHBOARD_NAV.achievements,
]

export const PAGES_WITH_CUSTOM_HEADER = new Set<DashboardNavId>([
  DASHBOARD_NAV.home,
  DASHBOARD_NAV.content,
  DASHBOARD_NAV.topics,
])

export function pageTitleKey(navId: DashboardNavId): string {
  return `pages.${navId}.title`
}

export function pageSubtitleKey(navId: DashboardNavId): string {
  return `pages.${navId}.subtitle`
}

export function navLabelKey(navId: DashboardNavId): string {
  return `nav.${navId}`
}
