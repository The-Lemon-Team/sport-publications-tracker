import { IsString, MinLength } from 'class-validator'

export class CreateTopicDto {
  @IsString()
  @MinLength(1)
  name!: string
}
