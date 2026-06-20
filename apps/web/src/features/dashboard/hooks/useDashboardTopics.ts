import type { TopicDto } from '@spt/shared'

import {
  useCreateStageMutation,
  useCreateTopicMutation,
  useGetTopicsQuery,
  useReorderPublicationsMutation,
  useReorderStagesMutation,
  useUpdatePublicationMutation,
  useUpdateStageMutation,
} from '@/app/api/baseApi'

export function useDashboardTopics() {
  const {
    data: apiTopics,
    isLoading,
    isError,
    refetch,
  } = useGetTopicsQuery()
  const [createTopic, { isLoading: isCreatingTopic }] = useCreateTopicMutation()
  const [createStage, { isLoading: isCreatingStage }] = useCreateStageMutation()
  const [reorderStages] = useReorderStagesMutation()
  const [updateStage] = useUpdateStageMutation()
  const [reorderPublications] = useReorderPublicationsMutation()
  const [updatePublication] = useUpdatePublicationMutation()

  const sourceTopics: TopicDto[] = apiTopics ?? []

  async function handleCreateTopic(name: string) {
    await createTopic({ name }).unwrap()
  }

  async function handleCreateStage(
    topicId: string,
    input: { name: string; hint?: string },
  ) {
    await createStage({ topicId, ...input }).unwrap()
  }

  async function handleReorderStages(topicId: string, stageIds: string[]) {
    await reorderStages({ topicId, stageIds }).unwrap()
  }

  async function handleUpdateStage(
    topicId: string,
    stageId: string,
    input: { name?: string; hint?: string | null },
  ) {
    await updateStage({ topicId, stageId, ...input }).unwrap()
  }

  async function handleReorderPublications(
    topicId: string,
    stageId: string,
    publicationIds: string[],
  ) {
    await reorderPublications({ topicId, stageId, publicationIds }).unwrap()
  }

  async function handleUpdatePublicationLabel(
    publicationId: string,
    label: string,
  ) {
    await updatePublication({ publicationId, label }).unwrap()
  }

  return {
    sourceTopics,
    isLoading,
    isError,
    refetch,
    handleCreateTopic,
    isCreatingTopic,
    handleCreateStage,
    isCreatingStage,
    handleReorderStages,
    handleUpdateStage,
    handleReorderPublications,
    handleUpdatePublicationLabel,
  }
}
