import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class EventDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) title!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(3000) description!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(60) category!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(180) venue!: string;
  @ApiProperty({ format: 'date-time' }) @IsDateString() startsAt!: string;
  @ApiProperty({ format: 'date-time' }) @IsDateString() endsAt!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
}

export class EventQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() cursor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) category?: string;
}
