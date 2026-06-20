import {

  MetricTrackingMode,

  type MetricTrackingMode as MetricTrackingModeType,

} from '@spt/shared'



export function isManualMetricTracking(
  mode: MetricTrackingModeType | undefined,
): boolean {
  return mode === MetricTrackingMode.MANUAL
}

export function isLiveMetricTracking(
  mode: MetricTrackingModeType | undefined,
): boolean {
  return mode === MetricTrackingMode.AUTOMATIC
}



export const METRIC_CAPTURE_SOURCE_LABELS = {

  SYNC: 'Авто',

  MANUAL: 'Вручную',

} as const


