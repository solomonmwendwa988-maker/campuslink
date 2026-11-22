import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(100) fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^[a-zA-Z0-9._]{3,20}$/) username?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) bio?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) course?: string;
  @ApiPropertyOptional({ description: 'Campus name within the current university.' }) @IsOptional() @IsString() @MaxLength(120) campus?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(10) yearOfStudy?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) interests?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
  @ApiPropertyOptional({ description: 'Profile photo data URL or URL.' }) @IsOptional() @IsString() @MaxLength(1500000) photoUrl?: string | null;
  @ApiPropertyOptional({ description: 'Profile cover data URL or URL.' }) @IsOptional() @IsString() @MaxLength(1500000) coverUrl?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrivate?: boolean;
}

export class ConnectionPageDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() cursor?: string;
}

export class DiscoverStudentsDto {
  @ApiPropertyOptional({ description: 'Search students by name, username, or course.' })
  @IsOptional() @IsString() @MaxLength(80) search?: string;
}

export class VerificationRequestDto {
  @IsString() @MinLength(2) @MaxLength(100) fullName!: string;
  @IsString() @MinLength(6) @MaxLength(40) studentId!: string;
  @IsString() @Matches(/^\+?[0-9]{9,15}$/) phone!: string;
  @IsString() @MaxLength(120) course!: string;
  @IsString() @MaxLength(120) campus!: string;
  @IsString() @MinLength(20) @MaxLength(800) reason!: string;
  @IsBoolean() attestationsAccepted!: boolean;
}
