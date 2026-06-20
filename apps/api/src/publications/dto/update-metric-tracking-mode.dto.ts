import { IsEnum } from 'class-validator'
import { MetricTrackingMode } from '@spt/shared'

export class UpdateMetricTrackingModeDto {
  @IsEnum(MetricTrackingMode)
  metricTrackingMode!: MetricTrackingMode
}
