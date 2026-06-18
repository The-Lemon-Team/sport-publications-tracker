import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, Outlet } from 'react-router-dom'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { useGetMeQuery } from '@/app/api/baseApi'
import {
  hydrate,
  logout,
  selectAuthHydrated,
  selectIsAuthenticated,
  setUser,
} from '@/features/auth/authSlice'

export function ProtectedRoute() {
  const dispatch = useDispatch()
  const hydrated = useSelector(selectAuthHydrated)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const { data: me, isError, error } = useGetMeQuery(undefined, {
    skip: !isAuthenticated,
  })

  useEffect(() => {
    dispatch(hydrate())
  }, [dispatch])

  useEffect(() => {
    if (me) dispatch(setUser(me))
  }, [me, dispatch])

  useEffect(() => {
    const status = (error as FetchBaseQueryError | undefined)?.status
    if (isError && status === 401) {
      dispatch(logout())
    }
  }, [isError, error, dispatch])

  if (!hydrated) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Загрузка…
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export function GuestRoute() {
  const hydrated = useSelector(selectAuthHydrated)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(hydrate())
  }, [dispatch])

  if (!hydrated) return null
  if (isAuthenticated) return <Navigate to="/" replace />
  return <Outlet />
}