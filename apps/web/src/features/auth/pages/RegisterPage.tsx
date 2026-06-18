import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useRegisterMutation } from '@/app/api/baseApi'
import { setCredentials } from '@/features/auth/authSlice'
import {
  AuthForm,
  AuthLayout,
  useRedirectIfAuthenticated,
} from '@/features/auth/components/AuthLayout'

export function RegisterPage() {
  useRedirectIfAuthenticated()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [register, { isLoading }] = useRegisterMutation()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(
    email: string,
    password: string,
    name?: string,
  ) {
    setError(null)
    try {
      const tokens = await register({
        email,
        password,
        name: name?.trim() || undefined,
      }).unwrap()
      dispatch(setCredentials(tokens))
      navigate('/', { replace: true })
    } catch {
      setError('Не удалось создать аккаунт. Возможно, email уже занят.')
    }
  }

  return (
    <AuthLayout
      title="Регистрация"
      description="Создайте аккаунт агентства — к нему будут привязаны OAuth-интеграции"
    >
      <AuthForm
        submitLabel="Создать аккаунт"
        alternateHref="/login"
        alternateLabel="Уже есть аккаунт? Войти"
        onSubmit={handleSubmit}
        withName
        error={error}
        loading={isLoading}
      />
    </AuthLayout>
  )
}
