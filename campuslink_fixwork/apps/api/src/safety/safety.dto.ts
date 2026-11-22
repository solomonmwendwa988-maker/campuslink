import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class BlockDto {
  @ApiProperty() @IsUUID() userId!: string;
}

export class ReportDto {
  @ApiProperty({ enum: ['USER', 'POST', 'LISTING', 'EVENT'] }) @IsIn(['USER', 'POST', 'LISTING', 'EVENT']) targetType!: string;
  @ApiProperty() @IsUUID() targetId!: string;
  @ApiProperty({ enum: ['SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'FRAUD', 'OTHER'] }) @IsIn(['SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'FRAUD', 'OTHER']) reason!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(1000) details?: string;
}
