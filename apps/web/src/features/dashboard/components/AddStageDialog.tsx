import { useEffect, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/card'

export function AddStageDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: { name: string; hint?: string }) => Promise<void>
  isSubmitting: boolean
}) {
  const [name, setName] = useState('')
  const [hint, setHint] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName('')
      setHint('')
      setError(null)
    }
  }, [open])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Введите название этапа')
      return
    }

    setError(null)
    try {
      await onSubmit({
        name: trimmedName,
        hint: hint.trim() || undefined,
      })
      onOpenChange(false)
    } catch {
      setError('Не удалось создать этап. Попробуйте ещё раз.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="relative">
        <DialogHeader>
          <DialogTitle>Новый этап</DialogTitle>
          <DialogDescription>
            Этап контент-пайплайна — например, «Анонс эфира» или «Нарезки».
          </DialogDescription>
        </DialogHeader>

        <form className="mt-4 flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="stage-name">Название</Label>
            <Input
              id="stage-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например, Эфир (live)"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="stage-hint">Подсказка (необязательно)</Label>
            <Input
              id="stage-hint"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="Краткое описание этапа"
            />
          </div>

          {error ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Plus className="size-4" />
              {isSubmitting ? 'Создание…' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
