import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsString, MaxLength, MinLength } from 'class-validator';

export class StartConversationDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(20) username!: string;
}

export class SendMessageDto {
  @ApiProperty() @IsString() @MinLength(8) @MaxLength(100) clientMessageId!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(5000) content!: string;
}
export class MessagePageDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() cursor?: string;
}
