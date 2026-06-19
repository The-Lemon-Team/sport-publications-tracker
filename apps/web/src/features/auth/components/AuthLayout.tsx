import { useEffect, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart3 } from 'lucide-react'
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

export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-svh">
      <div className="hidden w-1/2 flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <BarChart3 className="size-5" />
          </span>
          <div>
            <p className="font-semibold">Studio S10</p>
            <p className="text-sm text-sidebar-foreground/70">
              Sports Content Metrics
            </p>
          </div>
        </div>
        <div className="max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight">
            Трекинг публикаций по темам, этапам и площадкам
          </h1>
          <p className="mt-3 text-sidebar-foreground/70">
            Агрегируйте статистику из VK, YouTube, Instagram и других каналов в
            одном дашборде.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">Studio S10</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md border-border/80 shadow-md">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </div>
  )
}

interface AuthFormProps {
  submitLabel: string
  alternateHref: string
  alternateLabel: string
  onSubmit: (email: string, password: string, name?: string) => Promise<void>
  withName?: boolean
  error?: string | null
  loading?: boolean
}

export function AuthForm({
  submitLabel,
  alternateHref,
  alternateLabel,
  onSubmit,
  withName,
  error,
  loading,
}: AuthFormProps) {
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email') ?? '')
    const password = String(form.get('password') ?? '')
    const name = withName ? String(form.get('name') ?? '') : undefined
    await onSubmit(email, password, name)
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      {withName ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Имя</Label>
          <Input id="name" name="name" placeholder="Алексей" />
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@studio.s10"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Пароль</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={withName ? 'new-password' : 'current-password'}
          required
          minLength={8}
          placeholder="минимум 8 символов"
        />
      </div>

      {error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Загрузка…' : submitLabel}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          to={alternateHref}
          className="font-medium text-primary hover:underline"
        >
          {alternateLabel}
        </Link>
      </p>
    </form>
  )
}

export function useRedirectIfAuthenticated() {
  const navigate = useNavigate()
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) navigate('/', { replace: true })
  }, [navigate])
}
