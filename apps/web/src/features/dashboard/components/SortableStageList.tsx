import type { MetricHistoryEntryDto } from '@spt/shared'
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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { StageView } from '@/lib/dashboard-utils'
import { cn } from '@/lib/utils'
import { StageRow } from './StageRow'

function SortableStageItem({
  stage,
  index,
  compact,
  isEditing,
  onAddPublication,
  onMetricsSaved,
  onStageChange,
  onPublicationLabelChange,
  onReorderPublications,
}: {
  stage: StageView
  index: number
  compact?: boolean
  isEditing?: boolean
  onAddPublication: (stageId: string) => void
  onMetricsSaved?: (
    publicationId: string,
    metrics: { likes: number; comments: number },
    historyEntry: MetricHistoryEntryDto,
  ) => void
  onStageChange?: (
    stageId: string,
    input: { name?: string; hint?: string | null },
  ) => void
  onPublicationLabelChange?: (publicationId: string, label: string) => void
  onReorderPublications?: (stageId: string, publicationIds: string[]) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && 'relative z-10 opacity-80')}
    >
      <StageRow
        stage={stage}
        index={index}
        compact={compact}
        isEditing={isEditing}
        onAddPublication={onAddPublication}
        onMetricsSaved={onMetricsSaved}
        onStageChange={onStageChange}
        onPublicationLabelChange={onPublicationLabelChange}
        onReorderPublications={onReorderPublications}
        dragHandle={
          isEditing ? (
            <button
              type="button"
              className={cn(
                'flex shrink-0 cursor-grab touch-none items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing',
                compact ? 'size-6' : 'size-7',
              )}
              aria-label="Перетащить этап"
              {...attributes}
              {...listeners}
            >
              <GripVertical className={compact ? 'size-3.5' : 'size-4'} />
            </button>
          ) : undefined
        }
      />
    </div>
  )
}

export function SortableStageList({
  stages,
  compact,
  isEditing = false,
  onAddPublication,
  onMetricsSaved,
  onReorder,
  onStageChange,
  onPublicationLabelChange,
  onReorderPublications,
}: {
  stages: StageView[]
  compact?: boolean
  isEditing?: boolean
  onAddPublication: (stageId: string) => void
  onMetricsSaved?: (
    publicationId: string,
    metrics: { likes: number; comments: number },
    historyEntry: MetricHistoryEntryDto,
  ) => void
  onReorder: (stageIds: string[]) => void
  onStageChange?: (
    stageId: string,
    input: { name?: string; hint?: string | null },
  ) => void
  onPublicationLabelChange?: (publicationId: string, label: string) => void
  onReorderPublications?: (stageId: string, publicationIds: string[]) => void
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
    if (!isEditing) {
      return
    }

    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = stages.findIndex((stage) => stage.id === active.id)
    const newIndex = stages.findIndex((stage) => stage.id === over.id)
    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    const reordered = arrayMove(stages, oldIndex, newIndex)
    onReorder(reordered.map((stage) => stage.id))
  }

  if (!isEditing) {
    return (
      <>
        {stages.map((stage, index) => (
          <StageRow
            key={stage.id}
            stage={stage}
            index={index}
            compact={compact}
            onAddPublication={onAddPublication}
            onMetricsSaved={onMetricsSaved}
          />
        ))}
      </>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={stages.map((stage) => stage.id)}
        strategy={verticalListSortingStrategy}
      >
        {stages.map((stage, index) => (
          <SortableStageItem
            key={stage.id}
            stage={stage}
            index={index}
            compact={compact}
            isEditing={isEditing}
            onAddPublication={onAddPublication}
            onMetricsSaved={onMetricsSaved}
            onStageChange={onStageChange}
            onPublicationLabelChange={onPublicationLabelChange}
            onReorderPublications={onReorderPublications}
          />
        ))}
      </SortableContext>
    </DndContext>
  )
}
