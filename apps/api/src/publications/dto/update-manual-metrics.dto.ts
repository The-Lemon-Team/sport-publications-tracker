import { IsInt, Min } from 'class-validator'

export class UpdateManualMetricsDto {
  @IsInt()
  @Min(0)
  likes!: number

  @IsInt()
  @Min(0)
  comments!: number
}
