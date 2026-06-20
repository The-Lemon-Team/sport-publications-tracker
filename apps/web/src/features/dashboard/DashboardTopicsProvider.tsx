import { createContext, useContext, type ReactNode } from 'react'

import type { TopicDto } from '@spt/shared'

import { useDashboardTopics } from '@/features/dashboard/hooks/useDashboardTopics'

type DashboardTopicsContextValue = {
  sourceTopics: TopicDto[]
  isLoading: boolean
  isError: boolean
  refetch: () => void
  handleCreateTopic: (name: string) => Promise<void>
  isCreatingTopic: boolean
  handleCreateStage: (
    topicId: string,
    input: { name: string; hint?: string },
  ) => Promise<void>
  isCreatingStage: boolean
  handleReorderStages: (topicId: string, stageIds: string[]) => Promise<void>
  handleUpdateStage: (
    topicId: string,
    stageId: string,
    input: { name?: string; hint?: string | null },
  ) => Promise<void>
  handleReorderPublications: (
    topicId: string,
    stageId: string,
    publicationIds: string[],
  ) => Promise<void>
  handleUpdatePublicationLabel: (
    publicationId: string,
    label: string,
  ) => Promise<void>
}

const DashboardTopicsContext = createContext<DashboardTopicsContextValue | null>(
  null,
)

export function DashboardTopicsProvider({ children }: { children: ReactNode }) {
  const value = useDashboardTopics()

  return (
    <DashboardTopicsContext.Provider value={value}>
      {children}
    </DashboardTopicsContext.Provider>
  )
}

export function useDashboardTopicsContext() {
  const context = useContext(DashboardTopicsContext)

  if (!context) {
    throw new Error(
      'useDashboardTopicsContext must be used within DashboardTopicsProvider',
    )
  }

  return context
}
