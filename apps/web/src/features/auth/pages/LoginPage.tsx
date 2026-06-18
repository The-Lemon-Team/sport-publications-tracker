import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useLoginMutation } from '@/app/api/baseApi'
import { setCredentials } from '@/features/auth/authSlice'
import {
  AuthForm,
  AuthLayout,
  useRedirectIfAuthenticated,
} from '@/features/auth/components/AuthLayout'

export function LoginPage() {
  useRedirectIfAuthenticated()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [login, { isLoading }] = useLoginMutation()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(email: string, password: string) {
    setError(null)
    try {
      const tokens = await login({ email, password }).unwrap()
      dispatch(setCredentials(tokens))
      navigate('/', { replace: true })
    } catch {
      setError('Неверный email или пароль')
    }
  }

  return (
    <AuthLayout
      title="Вход"
      description="Войдите в аккаунт, чтобы управлять контент-сеткой и интеграциями"
    >
      <AuthForm
        submitLabel="Войти"
        alternateHref="/register"
        alternateLabel="Нет аккаунта? Зарегистрироваться"
        onSubmit={handleSubmit}
        error={error}
        loading={isLoading}
      />
    </AuthLayout>
  )
}
