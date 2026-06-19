import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type {
  AuthTokensDto,
  LoginRequest,
  OAuthConnectionDto,
  RegisterRequest,
  TopicDto,
  UpdateProfileRequest,
  UserDto,
} from '@spt/shared'

const baseQuery = fetchBaseQuery({
  baseUrl: '/api',
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    return headers
  },
})

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Topics', 'OAuthConnections', 'Me'],
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
    getOAuthConnections: builder.query<OAuthConnectionDto[], void>({
      query: () => '/oauth/connections',
      providesTags: ['OAuthConnections'],
    }),
  }),
})

export const {
  useRegisterMutation,
  useLoginMutation,
  useGetMeQuery,
  useUpdateProfileMutation,
  useGetTopicsQuery,
  useGetOAuthConnectionsQuery,
} = baseApi
