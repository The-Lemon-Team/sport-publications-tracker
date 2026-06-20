import { IsOptional, IsString } from 'class-validator'

export class UpdateStageDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  hint?: string | null
}
