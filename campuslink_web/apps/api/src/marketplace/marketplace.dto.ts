import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

const conditions = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR'] as const;
export class ListingDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) title!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(3000) description!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(60) category!: string;
  @ApiProperty({ minimum: 0, maximum: 10000000 }) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10000000) price!: number;
  @ApiProperty({ enum: conditions }) @IsIn(conditions) condition!: typeof conditions[number];
}

export class ListingQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() cursor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) category?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minPrice?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxPrice?: number;
}

export class ListingAvailabilityDto {
  @ApiProperty() @IsBoolean() available!: boolean;
}
