import {
  ChatBanType,
  CreateChatBan,
  DateString,
  UpdateChatBan
} from '@momentum/constants';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { EnumProperty } from '../decorators';

// Input DTOs for chat/voice bans. Kept in their own leaf module (no other DTO
// imports) so `report.dto` can pull in `CreateChatBanDto` without forming an
// import cycle with the full `ChatBanDto` (which references `UserDto`).

export class CreateChatBanDto implements CreateChatBan {
  @EnumProperty(ChatBanType, {
    description: 'The type of communication to ban (text or voice)'
  })
  readonly type: ChatBanType;

  @ApiPropertyOptional({
    type: String,
    description:
      'ISO8601 date the ban expires, or null/omitted for a permanent ban'
  })
  @IsOptional()
  @IsDateString()
  readonly expiresAt?: DateString | null;

  @ApiPropertyOptional({ type: String, description: 'The reason for the ban' })
  @IsOptional()
  @IsString()
  readonly reason?: string | null;
}

export class UpdateChatBanDto implements UpdateChatBan {
  @ApiPropertyOptional({
    type: String,
    description: 'ISO8601 date the ban expires, or null for a permanent ban'
  })
  @IsOptional()
  @IsDateString()
  readonly expiresAt?: DateString | null;

  @ApiPropertyOptional({ type: String, description: 'The reason for the ban' })
  @IsOptional()
  @IsString()
  readonly reason?: string | null;
}
