import { useEffect, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { PROVIDER_UI } from '@/lib/providers'
import type { PublicationViewStatus } from '@/lib/dashboard-utils'
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

export interface NewPublicationInput {
  providerId: string
  label: string
  stageId: string
  url: string
  status: PublicationViewStatus
}

export interface StageOption {
  topicId: string
  topicName: string
  stageId: string
  stageName: string
}

export function AddPublicationDialog({
  open,
  onOpenChange,
  stageOptions,
  defaultStageKey,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  stageOptions: StageOption[]
  defaultStageKey?: string
  onSubmit: (topicId: string, input: NewPublicationInput) => void
}) {
  const [providerId, setProviderId] = useState('tg')
  const [label, setLabel] = useState('')
  const [stageKey, setStageKey] = useState(defaultStageKey ?? '')
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (open) {
      const firstKey = stageOptions[0]
        ? `${stageOptions[0].topicId}::${stageOptions[0].stageId}`
        : ''
      setProviderId('tg')
      setLabel('')
      setStageKey(defaultStageKey ?? firstKey)
      setUrl('')
    }
  }, [open, defaultStageKey, stageOptions])

  const selectedStage = stageOptions.find(
    (s) => `${s.topicId}::${s.stageId}` === stageKey,
  )

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!selectedStage) return
    const provider = PROVIDER_UI.find((p) => p.id === providerId)
    onSubmit(selectedStage.topicId, {
      providerId,
      label: label.trim() || provider?.name || providerId,
      stageId: selectedStage.stageId,
      url: url.trim(),
      status: url.trim() ? 'published' : 'scheduled',
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="relative">
        <DialogHeader>
          <DialogTitle>Add Publication</DialogTitle>
          <DialogDescription>
            Привяжите новый пост к этапу контента. Выберите площадку, укажите
            метку и вставьте ссылку.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <select
              id="provider"
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
            >
              {PROVIDER_UI.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
            <div className="pt-1">
              <ProviderBadge providerId={providerId} size="sm" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pub-label">Custom label</Label>
            <Input
              id="pub-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="например, VK Юрий"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stage">Stage</Label>
            <select
              id="stage"
              value={stageKey}
              onChange={(e) => setStageKey(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
            >
              {stageOptions.map((option) => (
                <option
                  key={`${option.topicId}::${option.stageId}`}
                  value={`${option.topicId}::${option.stageId}`}
                >
                  {option.topicName} — {option.stageName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pub-url">Post URL</Label>
            <Input
              id="pub-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
            />
            <p className="text-xs text-muted-foreground">
              Оставьте пустым, чтобы создать запланированный слот.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={!selectedStage}>
              <Plus className="size-4" />
              Add Publication
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
