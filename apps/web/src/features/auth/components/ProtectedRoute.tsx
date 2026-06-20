import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, Outlet } from 'react-router-dom'
import { useGetMeQuery } from '@/app/api/baseApi'
import {
  hydrate,
  selectAuthHydrated,
  selectIsAuthenticated,
  setUser,
} from '@/features/auth/authSlice'

export function ProtectedRoute() {
  const dispatch = useDispatch()
  const hydrated = useSelector(selectAuthHydrated)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const { data: me } = useGetMeQuery(undefined, {
    skip: !isAuthenticated,
  })

  useEffect(() => {
    dispatch(hydrate())
  }, [dispatch])

  useEffect(() => {
    if (me) dispatch(setUser(me))
  }, [me, dispatch])

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