import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { PublicationView } from '@/lib/dashboard-utils'
import { getProviderUi } from '@/lib/providers'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { ProviderBadge } from './ProviderBadge'

function SortablePublicationItem({
  publication,
  compact,
  onLabelChange,
}: {
  publication: PublicationView
  compact?: boolean
  onLabelChange: (publicationId: string, label: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: publication.id })

  const provider = getProviderUi(publication.providerId)
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex flex-col border border-border bg-card',
        compact ? 'gap-1.5 rounded-lg p-2' : 'gap-2 rounded-xl p-3',
        isDragging && 'relative z-10 opacity-80 shadow-md',
      )}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          className={cn(
            'flex shrink-0 cursor-grab touch-none items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing',
            compact ? 'size-6' : 'size-7',
          )}
          aria-label="Перетащить публикацию"
          {...attributes}
          {...listeners}
        >
          <GripVertical className={compact ? 'size-3.5' : 'size-4'} />
        </button>

        <ProviderBadge
          providerId={publication.providerId}
          size={compact ? 'xs' : 'sm'}
        />

        <div className="min-w-0 flex-1">
          <Input
            defaultValue={publication.label}
            className={cn(
              'h-7 px-2',
              compact ? 'text-xs' : 'text-sm',
            )}
            placeholder="Заголовок публикации"
            onBlur={(event) => {
              const next = event.target.value.trim()
              if (next && next !== publication.label) {
                onLabelChange(publication.id, next)
              }
            }}
          />
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {provider.name}
          </p>
        </div>
      </div>
    </div>
  )
}

export function SortablePublicationList({
  publications,
  compact,
  onLabelChange,
  onReorder,
}: {
  publications: PublicationView[]
  compact?: boolean
  onLabelChange: (publicationId: string, label: string) => void
  onReorder: (publicationIds: string[]) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = publications.findIndex((pub) => pub.id === active.id)
    const newIndex = publications.findIndex((pub) => pub.id === over.id)
    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    const reordered = arrayMove(publications, oldIndex, newIndex)
    onReorder(reordered.map((pub) => pub.id))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={publications.map((pub) => pub.id)}
        strategy={rectSortingStrategy}
      >
        <div
          className={cn(
            'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
            compact ? 'gap-1.5' : 'gap-2.5',
          )}
        >
          {publications.map((publication) => (
            <SortablePublicationItem
              key={publication.id}
              publication={publication}
              compact={compact}
              onLabelChange={onLabelChange}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
