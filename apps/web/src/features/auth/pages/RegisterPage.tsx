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
// import { VkLoginButton } from '@/features/auth/components/VkLoginButton'

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
      {/* VK site login — disabled
      <div className="mt-4 flex flex-col gap-3">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">или</span>
          </div>
        </div>
        <VkLoginButton />
      </div>
      */}
    </AuthLayout>
  )
}
