import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react'
import type {
  AuthTokensDto,
  CreatePublicationRequest,
  CreateStageRequest,
  CreateSubscriberSourceRequest,
  CreateTopicRequest,
  LoginRequest,
  MetricHistoryPageDto,
  OAuthConnectionDto,
  PublicationDto,
  RegisterRequest,
  ReorderPublicationsRequest,
  ReorderStagesRequest,
  SubscriberHistoryPageDto,
  SubscriberSourceDto,
  StageDto,
  TopicDto,
  UpdateManualMetricsRequest,
  UpdateMetricTrackingModeRequest,
  UpdatePublicationRequest,
  UpdateProfileRequest,
  UpdateStageRequest,
  UserDto,
  YouTubeChannelMetricsDto,
  YouTubeVideoMetricsDto,
} from '@spt/shared'
import { logout, setCredentials } from '@/features/auth/authSlice'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api',
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    return headers
  },
})

function getRequestUrl(args: string | FetchArgs): string {
  return typeof args === 'string' ? args : args.url
}

const AUTH_PATHS_WITHOUT_REAUTH = new Set([
  '/auth/refresh',
  '/auth/login',
  '/auth/register',
])

let refreshPromise: Promise<boolean> | null = null

async function tryRefreshTokens(
  api: Parameters<typeof rawBaseQuery>[1],
  extraOptions: Parameters<typeof rawBaseQuery>[2],
): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return false

  const result = await rawBaseQuery(
    {
      url: '/auth/refresh',
      method: 'POST',
      body: { refreshToken },
    },
    api,
    extraOptions,
  )

  if (result.data) {
    api.dispatch(setCredentials(result.data as AuthTokensDto))
    return true
  }

  return false
}

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const url = getRequestUrl(args)
  let result = await rawBaseQuery(args, api, extraOptions)

  if (
    result.error?.status === 401 &&
    !AUTH_PATHS_WITHOUT_REAUTH.has(url)
  ) {
    if (!refreshPromise) {
      refreshPromise = tryRefreshTokens(api, extraOptions).finally(() => {
        refreshPromise = null
      })
    }

    const refreshed = await refreshPromise
    if (refreshed) {
      result = await rawBaseQuery(args, api, extraOptions)
    } else {
      api.dispatch(logout())
    }
  }

  return result
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Topics', 'OAuthConnections', 'Me', 'SubscriberSources', 'Publications'],
  endpoints: (builder) => ({
    register: builder.mutation<AuthTokensDto, RegisterRequest>({
      query: (body) => ({
        url: '/auth/register',
        method: 'POST',
        body,
      }),
    }),
    login: builder.mutation<AuthTokensDto, LoginRequest>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
    }),
    getMe: builder.query<UserDto, void>({
      query: () => '/auth/me',
      providesTags: ['Me'],
    }),
    updateProfile: builder.mutation<UserDto, UpdateProfileRequest>({
      query: (body) => ({
        url: '/auth/me',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Me'],
    }),
    getTopics: builder.query<TopicDto[], void>({
      query: () => '/topics',
      providesTags: ['Topics'],
    }),
    createTopic: builder.mutation<TopicDto, CreateTopicRequest>({
      query: (body) => ({
        url: '/topics',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Topics'],
    }),
    createStage: builder.mutation<
      StageDto,
      { topicId: string } & CreateStageRequest
    >({
      query: ({ topicId, ...body }) => ({
        url: `/topics/${topicId}/stages`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Topics'],
    }),
    reorderStages: builder.mutation<
      TopicDto,
      { topicId: string } & ReorderStagesRequest
    >({
      query: ({ topicId, ...body }) => ({
        url: `/topics/${topicId}/stages/order`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Topics'],
    }),
    updateStage: builder.mutation<
      StageDto,
      { topicId: string; stageId: string } & UpdateStageRequest
    >({
      query: ({ topicId, stageId, ...body }) => ({
        url: `/topics/${topicId}/stages/${stageId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Topics'],
    }),
    reorderPublications: builder.mutation<
      StageDto,
      { topicId: string; stageId: string } & ReorderPublicationsRequest
    >({
      query: ({ topicId, stageId, ...body }) => ({
        url: `/topics/${topicId}/stages/${stageId}/publications/order`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Topics'],
    }),
    createPublication: builder.mutation<PublicationDto, CreatePublicationRequest>({
      query: (body) => ({
        url: '/publications',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Topics', 'Publications'],
    }),
    getOAuthConnections: builder.query<OAuthConnectionDto[], void>({
      query: () => '/oauth/connections',
      providesTags: ['OAuthConnections'],
    }),
    getYouTubeMetrics: builder.query<YouTubeVideoMetricsDto, string>({
      query: (url) => `/youtube/metrics?url=${encodeURIComponent(url)}`,
    }),
    getYouTubeChannelMetrics: builder.query<YouTubeChannelMetricsDto, string>({
      query: (input) =>
        `/youtube/channel?input=${encodeURIComponent(input)}`,
    }),
    getYouTubeChannelsMetrics: builder.query<
      YouTubeChannelMetricsDto[],
      string[]
    >({
      query: (inputs) => {
        const params = new URLSearchParams()
        for (const input of inputs) {
          params.append('input', input)
        }
        return `/youtube/channels?${params.toString()}`
      },
    }),
    getSubscriberSources: builder.query<SubscriberSourceDto[], void>({
      query: () => '/subscribers/sources',
      providesTags: ['SubscriberSources'],
    }),
    createSubscriberSource: builder.mutation<
      SubscriberSourceDto,
      CreateSubscriberSourceRequest
    >({
      query: (body) => ({
        url: '/subscribers/sources',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['SubscriberSources'],
    }),
    deleteSubscriberSource: builder.mutation<void, string>({
      query: (sourceId) => ({
        url: `/subscribers/sources/${sourceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SubscriberSources'],
    }),
    revokeOAuthConnection: builder.mutation<void, string>({
      query: (connectionId) => ({
        url: `/oauth/connections/${connectionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['OAuthConnections'],
    }),
    syncSubscriberSources: builder.mutation<SubscriberSourceDto[], void>({
      query: () => ({
        url: '/subscribers/sync',
        method: 'POST',
      }),
      invalidatesTags: ['SubscriberSources'],
    }),
    getSubscriberHistory: builder.query<
      SubscriberHistoryPageDto,
      { sourceId: string; cursor?: string }
    >({
      query: ({ sourceId, cursor }) => {
        const params = new URLSearchParams()
        if (cursor) params.set('cursor', cursor)
        const qs = params.toString()
        return `/subscribers/sources/${sourceId}/history${qs ? `?${qs}` : ''}`
      },
    }),
    updatePublication: builder.mutation<
      PublicationDto,
      { publicationId: string } & UpdatePublicationRequest
    >({
      query: ({ publicationId, ...body }) => ({
        url: `/publications/${publicationId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Topics', 'Publications'],
    }),
    deletePublication: builder.mutation<void, string>({
      query: (publicationId) => ({
        url: `/publications/${publicationId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Topics', 'Publications'],
    }),
    updateManualMetrics: builder.mutation<
      PublicationDto,
      { publicationId: string } & UpdateManualMetricsRequest
    >({
      query: ({ publicationId, likes, comments }) => ({
        url: `/publications/${publicationId}/metrics`,
        method: 'PATCH',
        body: { likes, comments },
      }),
      invalidatesTags: ['Topics', 'Publications'],
    }),
    updateMetricTrackingMode: builder.mutation<
      PublicationDto,
      { publicationId: string } & UpdateMetricTrackingModeRequest
    >({
      query: ({ publicationId, metricTrackingMode }) => ({
        url: `/publications/${publicationId}/metric-tracking-mode`,
        method: 'PATCH',
        body: { metricTrackingMode },
      }),
      invalidatesTags: ['Topics', 'Publications'],
    }),
    getMetricHistory: builder.query<
      MetricHistoryPageDto,
      { publicationId: string; cursor?: string }
    >({
      query: ({ publicationId, cursor }) => {
        const params = new URLSearchParams()
        if (cursor) params.set('cursor', cursor)
        const qs = params.toString()
        return `/publications/${publicationId}/metric-history${qs ? `?${qs}` : ''}`
      },
    }),
  }),
})

export const {
  useRegisterMutation,
  useLoginMutation,
  useGetMeQuery,
  useUpdateProfileMutation,
  useGetTopicsQuery,
  useCreateTopicMutation,
  useCreateStageMutation,
  useReorderStagesMutation,
  useUpdateStageMutation,
  useReorderPublicationsMutation,
  useCreatePublicationMutation,
  useGetOAuthConnectionsQuery,
  useLazyGetYouTubeMetricsQuery,
  useLazyGetYouTubeChannelMetricsQuery,
  useLazyGetYouTubeChannelsMetricsQuery,
  useGetSubscriberSourcesQuery,
  useCreateSubscriberSourceMutation,
  useDeleteSubscriberSourceMutation,
  useRevokeOAuthConnectionMutation,
  useSyncSubscriberSourcesMutation,
  useLazyGetSubscriberHistoryQuery,
  useUpdatePublicationMutation,
  useDeletePublicationMutation,
  useUpdateManualMetricsMutation,
  useUpdateMetricTrackingModeMutation,
  useLazyGetMetricHistoryQuery,
} = baseApi
