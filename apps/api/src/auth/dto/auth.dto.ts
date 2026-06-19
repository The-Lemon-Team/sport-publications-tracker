import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator'

export class RegisterDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(8)
  password!: string

  @IsOptional()
  @IsString()
  name?: string
}

export class LoginDto {
  @IsEmail()
  email!: string

  @IsString()
  password!: string
}

export class RefreshDto {
  @IsString()
  refreshToken!: string
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  currentPassword?: string

  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword?: string
}
