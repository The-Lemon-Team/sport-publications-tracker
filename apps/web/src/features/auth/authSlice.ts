import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AuthTokensDto, UserDto } from '@spt/shared'

const ACCESS_KEY = 'accessToken'
const REFRESH_KEY = 'refreshToken'
const USER_KEY = 'user'

export interface AuthState {
  user: UserDto | null
  accessToken: string | null
  refreshToken: string | null
  hydrated: boolean
}

function readStoredAuth(): Pick<AuthState, 'user' | 'accessToken' | 'refreshToken'> {
  try {
    const accessToken = localStorage.getItem(ACCESS_KEY)
    const refreshToken = localStorage.getItem(REFRESH_KEY)
    const userRaw = localStorage.getItem(USER_KEY)
    const user = userRaw ? (JSON.parse(userRaw) as UserDto) : null
    return { accessToken, refreshToken, user }
  } catch {
    return { accessToken: null, refreshToken: null, user: null }
  }
}

const initialState: AuthState = {
  ...readStoredAuth(),
  hydrated: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    hydrate(state) {
      const stored = readStoredAuth()
      state.accessToken = stored.accessToken
      state.refreshToken = stored.refreshToken
      state.user = stored.user
      state.hydrated = true
    },
    setCredentials(state, action: PayloadAction<AuthTokensDto>) {
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken
      state.user = action.payload.user
      localStorage.setItem(ACCESS_KEY, action.payload.accessToken)
      localStorage.setItem(REFRESH_KEY, action.payload.refreshToken)
      localStorage.setItem(USER_KEY, JSON.stringify(action.payload.user))
    },
    setUser(state, action: PayloadAction<UserDto>) {
      state.user = action.payload
      localStorage.setItem(USER_KEY, JSON.stringify(action.payload))
    },
    logout(state) {
      state.accessToken = null
      state.refreshToken = null
      state.user = null
      localStorage.removeItem(ACCESS_KEY)
      localStorage.removeItem(REFRESH_KEY)
      localStorage.removeItem(USER_KEY)
    },
  },
})

export const { hydrate, setCredentials, setUser, logout } = authSlice.actions
export const authReducer = authSlice.reducer

export const selectIsAuthenticated = (state: { auth: AuthState }) =>
  Boolean(state.auth.accessToken)

export const selectAuthUser = (state: { auth: AuthState }) => state.auth.user

export const selectAuthHydrated = (state: { auth: AuthState }) =>
  state.auth.hydrated
