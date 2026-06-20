export const SIGNIFICANT_NEGATIVE_DELTA_THRESHOLDS = {
  views: -10,
  likes: -3,
  comments: -2,
} as const

export type MetricDeltaField = keyof typeof SIGNIFICANT_NEGATIVE_DELTA_THRESHOLDS

/** Keeps delta only when it is meaningfully negative; otherwise returns 0. */
export function pickSignificantNegativeDelta(
  delta: number,
  field: MetricDeltaField,
): number {
  const threshold = SIGNIFICANT_NEGATIVE_DELTA_THRESHOLDS[field]
  return delta < 0 && delta <= threshold ? delta : 0
}

export interface MetricDeltaTriplet {
  views: number
  likes: number
  comments: number
}

export function pickHighlightMetricDeltas(deltas: {
  viewsDelta: number
  likesDelta: number
  commentsDelta: number
}): MetricDeltaTriplet | null {
  const views = pickSignificantNegativeDelta(deltas.viewsDelta, 'views')
  const likes = pickSignificantNegativeDelta(deltas.likesDelta, 'likes')
  const comments = pickSignificantNegativeDelta(deltas.commentsDelta, 'comments')

  if (views === 0 && likes === 0 && comments === 0) {
    return null
  }

  return { views, likes, comments }
}

export function hasHighlightMetricDeltas(
  deltas: MetricDeltaTriplet | null | undefined,
): deltas is MetricDeltaTriplet {
  if (!deltas) return false
  return deltas.views !== 0 || deltas.likes !== 0 || deltas.comments !== 0
}
