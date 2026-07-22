import { ChatBan, ChatBanType, DateString } from '@momentum/constants';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import {
  CreatedAtProperty,
  EnumProperty,
  IdProperty,
  NestedProperty,
  UpdatedAtProperty
} from '../decorators';
import { UserDto } from '../user/user.dto';

export class ChatBanDto implements ChatBan {
  @IdProperty()
  readonly id: number;

  @EnumProperty(ChatBanType, {
    description: 'The type of communication the ban applies to (text or voice)'
  })
  readonly type: ChatBanType;

  @ApiPropertyOptional({
    type: String,
    description:
      'When the ban expires as an ISO8601 date string, or null if permanent'
  })
  @IsOptional()
  @IsDateString()
  readonly expiresAt: DateString | null;

  @ApiPropertyOptional({ type: String, description: 'The reason for the ban' })
  @IsOptional()
  @IsString()
  readonly reason: string | null;

  @IdProperty({ description: 'The user ID of the banned user' })
  readonly targetID: number;

  @NestedProperty(UserDto, { lazy: true, required: false })
  readonly target?: UserDto;

  @IdProperty({
    required: false,
    description: 'The user ID of the admin who issued the ban'
  })
  readonly issuerID: number | null;

  @NestedProperty(UserDto, { lazy: true, required: false })
  readonly issuer?: UserDto;

  @IdProperty({
    required: false,
    description: 'The ID of the report whose resolution created this ban'
  })
  readonly reportID: number | null;

  @CreatedAtProperty()
  readonly createdAt: DateString;

  @UpdatedAtProperty()
  readonly updatedAt: DateString;
}
