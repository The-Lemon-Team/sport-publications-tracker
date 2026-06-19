import { useEffect, useState, type FormEvent } from 'react'
import { useDispatch } from 'react-redux'
import { useGetMeQuery, useUpdateProfileMutation } from '@/app/api/baseApi'
import { setUser } from '@/features/auth/authSlice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function SettingsView() {
  const dispatch = useDispatch()
  const { data: user, isLoading } = useGetMeQuery()
  const [updateProfile, { isLoading: saving }] = useUpdateProfileMutation()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name ?? '')
      setEmail(user.email)
    }
  }, [user])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const payload: {
      name?: string
      email?: string
      currentPassword?: string
      newPassword?: string
    } = {}

    if (name !== (user?.name ?? '')) {
      payload.name = name
    }
    if (email !== user?.email) {
      payload.email = email
    }
    if (newPassword) {
      payload.currentPassword = currentPassword
      payload.newPassword = newPassword
    }

    if (!payload.name && !payload.email && !payload.newPassword) {
      setError('Нет изменений для сохранения')
      return
    }

    if (!currentPassword) {
      setError('Введите текущий пароль для сохранения изменений')
      return
    }

    try {
      const updated = await updateProfile({
        ...payload,
        currentPassword: currentPassword || undefined,
      }).unwrap()
      dispatch(setUser(updated))
      setCurrentPassword('')
      setNewPassword('')
      setSuccess(true)
    } catch {
      setError('Не удалось сохранить изменения. Проверьте данные и пароль.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Загрузка…
      </div>
    )
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-6">
      <Card className="mx-auto w-full max-w-lg">
        <CardHeader>
          <CardTitle>Профиль</CardTitle>
          <CardDescription>
            Ваши данные аккаунта. Для изменения email или имени потребуется
            текущий пароль.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="settings-name">Имя</Label>
              <Input
                id="settings-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваше имя"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="settings-email">Email</Label>
              <Input
                id="settings-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              ID: {user?.id}
            </div>

            <div className="border-t border-border pt-4">
              <p className="mb-3 text-sm font-medium">Смена пароля</p>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="settings-current-password">
                    Текущий пароль
                  </Label>
                  <Input
                    id="settings-current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Нужен для сохранения изменений"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="settings-new-password">Новый пароль</Label>
                  <Input
                    id="settings-new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    placeholder="Оставьте пустым, если не меняете"
                  />
                </div>
              </div>
            </div>

            {error ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            {success ? (
              <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
                Изменения сохранены
              </p>
            ) : null}

            <Button type="submit" disabled={saving}>
              {saving ? 'Сохранение…' : 'Сохранить'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
