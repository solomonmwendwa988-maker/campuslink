import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsEmail, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @ApiProperty() @IsString() @Matches(/^[a-zA-Z0-9._]{3,20}$/) username!: string;
  @ApiProperty() @IsEmail() @MaxLength(254) email!: string;
  @ApiProperty({ minLength: 10 }) @IsString() @MinLength(10) @MaxLength(128) password!: string;
  @ApiProperty({ example: 'main-campus' }) @IsString() @MinLength(2) campus!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) course!: string;
  @ApiProperty({ minimum: 1, maximum: 10 }) @IsInt() @Min(1) @Max(10) year!: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(500) bio?: string;
  @ApiProperty({ required: false, type: [String], maxItems: 20 }) @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(80, { each: true }) interests?: string[];
  @ApiProperty({ required: false, type: [String], maxItems: 30 }) @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(80, { each: true }) skills?: string[];
  @ApiPropertyOptional({ description: 'Optimized profile image data URL.' }) @IsOptional() @IsString() @MaxLength(1500000) photoUrl?: string;
}

export class LoginDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(254) identifier!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(128) password!: string;
}

export class EmailDto {
  @ApiProperty() @IsEmail() @MaxLength(254) email!: string;
}

export class ChangePasswordDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(128) currentPassword!: string;
  @ApiProperty() @IsString() @MinLength(10) @MaxLength(128) newPassword!: string;
}

export class ConfirmPasswordDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(128) password!: string;
}
