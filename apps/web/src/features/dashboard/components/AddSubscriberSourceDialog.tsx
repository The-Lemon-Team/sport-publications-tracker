import { useEffect, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { useCreateSubscriberSourceMutation } from '@/app/api/baseApi'
import {
  getSubscribableSourceType,
  parseVkGroupInput,
  parseYouTubeChannelInput,
  providerOf,
} from '@/lib/provider-connections'
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
import { ProviderBadge } from './ProviderBadge'

const CHANNEL_COPY: Record<
  string,
  {
    label: string
    placeholder: string
    hint: string
    notFoundError: string
    submitLabel: string
  }
> = {
  youtube: {
    label: 'Канал YouTube',
    placeholder: 'https://youtube.com/@studio-s10',
    hint: 'Поддерживаются ссылки вида youtube.com/@handle, /channel/… и /c/…',
    notFoundError:
      'Канал не найден или YouTube API недоступен. Проверьте ссылку.',
    submitLabel: 'Добавить канал',
  },
  vk: {
    label: 'Группа VK',
    placeholder: 'https://vk.com/studio.s10',
    hint: 'Поддерживаются vk.com/screen_name, vk.com/club123 и vk.com/public123',
    notFoundError:
      'Группа не найдена или VK API недоступен. Проверьте ссылку.',
    submitLabel: 'Добавить группу',
  },
}

export function AddSubscriberSourceDialog({
  open,
  providerId,
  onOpenChange,
  onAdded,
}: {
  open: boolean
  providerId: string
  onOpenChange: (open: boolean) => void
  onAdded: () => void
}) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [createSource, { isLoading }] = useCreateSubscriberSourceMutation()

  const sourceType = getSubscribableSourceType(providerId)
  const provider = providerOf(providerId)
  const copy =
    CHANNEL_COPY[providerId] ?? {
      label: provider.name,
      placeholder: '',
      hint: '',
      notFoundError: 'Источник не найден. Проверьте ссылку.',
      submitLabel: 'Добавить',
    }

  useEffect(() => {
    if (open) {
      setUrl('')
      setError(null)
    }
  }, [open, providerId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const parsed =
      providerId === 'vk'
        ? parseVkGroupInput(url)
        : parseYouTubeChannelInput(url)
    if (!parsed) {
      setError(
        providerId === 'vk'
          ? 'Укажите ссылку на группу VK'
          : 'Укажите ссылку на канал или @handle',
      )
      return
    }

    try {
      await createSource({ input: url.trim() }).unwrap()
      onAdded()
      onOpenChange(false)
    } catch {
      setError(copy.notFoundError)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="relative">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ProviderBadge providerId={providerId} size="sm" />
            <DialogTitle>
              Добавить {sourceType?.addLabel ?? provider.name}
            </DialogTitle>
          </div>
          <DialogDescription>
            Вставьте ссылку — подписчики появятся в блоке в реальном времени, а
            изменения будут сохраняться в истории.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="channel-url">{copy.label}</Label>
            <Input
              id="channel-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={copy.placeholder}
              autoFocus
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">{copy.hint}</p>
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
              disabled={isLoading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={!url.trim() || isLoading}>
              <Plus className="size-4" />
              {isLoading ? 'Проверяем…' : copy.submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
