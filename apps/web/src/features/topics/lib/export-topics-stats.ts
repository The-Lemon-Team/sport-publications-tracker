import { PROVIDER_LABELS, PublicationStatus } from '@spt/shared'
import * as XLSX from 'xlsx'
import { formatSubscriberDate } from '@/lib/dashboard-utils'
import type { TopicPublicationRow } from './topic-filters'

function formatExportDate(date: Date): string {
  return formatSubscriberDate(date.toISOString())
}

function buildExportRows(rows: TopicPublicationRow[]) {
  return rows.map((row) => {
    const isPublished = row.status === PublicationStatus.PUBLISHED

    return {
      Тема: row.topicName,
      Этап: row.stageName,
      Публикация: row.label,
      Площадка: PROVIDER_LABELS[row.provider],
      Статус: isPublished ? 'Опубликовано' : 'Запланировано',
      Дата: row.date ? formatExportDate(row.date) : '',
      Просмотры: isPublished ? row.metrics.views : '',
      Лайки: isPublished ? row.metrics.likes : '',
      Комментарии: isPublished ? row.metrics.comments : '',
      'Ссылка на пост': row.postUrl ?? '',
    }
  })
}

export function exportTopicsStatsToExcel(
  rows: TopicPublicationRow[],
  filename?: string,
): void {
  if (rows.length === 0) return

  const sheet = XLSX.utils.json_to_sheet(buildExportRows(rows))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Статистика')

  const date = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, filename ?? `topics-stats-${date}.xlsx`)
}
