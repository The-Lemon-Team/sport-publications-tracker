import { IsEnum, IsOptional, IsString } from 'class-validator'
import { MetricTrackingMode } from '@spt/shared'

export class UpdatePublicationDto {
  @IsOptional()
  @IsString()
  label?: string

  @IsOptional()
  @IsString()
  postUrl?: string | null

  @IsOptional()
  @IsEnum(MetricTrackingMode)
  metricTrackingMode?: MetricTrackingMode
}
