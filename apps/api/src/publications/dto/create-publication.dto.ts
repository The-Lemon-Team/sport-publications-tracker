import { Type } from 'class-transformer'
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'
import {
  MetricTrackingMode,
  Provider,
  PublicationStatus,
} from '@spt/shared'

class InitialMetricsDto {
  @IsInt()
  @Min(0)
  views!: number

  @IsInt()
  @Min(0)
  likes!: number

  @IsInt()
  @Min(0)
  comments!: number
}

export class CreatePublicationDto {
  @IsString()
  @MinLength(1)
  stageId!: string

  @IsEnum(Provider)
  provider!: Provider

  @IsString()
  @MinLength(1)
  channelName!: string

  @IsOptional()
  @IsString()
  label?: string

  @IsOptional()
  @IsString()
  postUrl?: string

  @IsOptional()
  @IsEnum(PublicationStatus)
  status?: PublicationStatus

  @IsOptional()
  @IsEnum(MetricTrackingMode)
  metricTrackingMode?: MetricTrackingMode

  @IsOptional()
  @ValidateNested()
  @Type(() => InitialMetricsDto)
  initialMetrics?: InitialMetricsDto
}
