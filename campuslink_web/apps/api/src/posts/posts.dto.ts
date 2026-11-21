import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreatePostDto {
  @ApiProperty({ maxLength: 3000 }) @IsString() @MinLength(1) @MaxLength(3000) content!: string;
}

export class CreateCommentDto {
  @ApiProperty({ maxLength: 1500 }) @IsString() @MinLength(1) @MaxLength(1500) content!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() parentId?: string;
}

export class PostPageDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() cursor?: string;
}
