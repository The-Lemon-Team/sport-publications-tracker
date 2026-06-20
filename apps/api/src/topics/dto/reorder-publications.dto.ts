import { ArrayMinSize, IsArray, IsString } from 'class-validator'

export class ReorderPublicationsDto {
  @IsArray()
  @ArrayMinSize(0)
  @IsString({ each: true })
  publicationIds!: string[]
}
