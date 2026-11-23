import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, IsArray, ArrayMaxSize, Matches } from 'class-validator';

const conditions = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR'] as const;
const listingSorts = ['NEWEST', 'PRICE_LOW', 'PRICE_HIGH'] as const;
export class ListingDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) title!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(3000) description!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(60) category!: string;
  @ApiProperty({ minimum: 0, maximum: 10000000 }) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10000000) price!: number;
  @ApiProperty({ enum: conditions }) @IsIn(conditions) condition!: typeof conditions[number];
  @ApiPropertyOptional({ maxItems: 3, description: 'Up to three compressed JPEG, PNG or WebP images, each under 220 KB encoded.' })
  @IsOptional() @IsArray() @ArrayMaxSize(3) @IsString({ each: true }) @MaxLength(300000, { each: true })
  @Matches(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/, { each: true })
  images?: string[];
}

export class ListingQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() cursor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) category?: string;
  @ApiPropertyOptional({ enum: conditions }) @IsOptional() @IsIn(conditions) condition?: typeof conditions[number];
  @ApiPropertyOptional({ enum: listingSorts, default: 'NEWEST' }) @IsOptional() @IsIn(listingSorts) sort?: typeof listingSorts[number];
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minPrice?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxPrice?: number;
}

export class ListingAvailabilityDto {
  @ApiProperty() @IsBoolean() available!: boolean;
}
