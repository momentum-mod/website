import {
  ActiveChatBan,
  AdminCreateChatBan,
  ChatBan,
  ChatBanType,
  CreateChatBan,
  DateString,
  PlayerChatBans,
  PlayerChatBansList,
  PlayerChatBansQuery,
  UpdateChatBan
} from '@momentum/constants';
import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString
} from 'class-validator';
import {
  CreatedAtProperty,
  EnumProperty,
  IdProperty,
  NestedProperty,
  UpdatedAtProperty
} from '../decorators';
import { UserDto } from '../user/user.dto';
import { IsSteamCommunityID } from '../../validators';

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

export class CreateChatBanDto
  extends PickType(ChatBanDto, ['type', 'expiresAt', 'reason'] as const)
  implements CreateChatBan {}

export class AdminCreateChatBanDto
  extends PickType(ChatBanDto, [
    'type',
    'expiresAt',
    'reason',
    'targetID'
  ] as const)
  implements AdminCreateChatBan {}

export class UpdateChatBanDto
  extends PickType(ChatBanDto, ['expiresAt', 'reason'] as const)
  implements UpdateChatBan {}

export class ActiveChatBanDto
  extends PickType(ChatBanDto, ['type', 'expiresAt', 'reason'] as const)
  implements ActiveChatBan {}

/** Steam's limit on lobby members, so a client can query its whole lobby. */
const MAX_PLAYER_CHAT_BANS_QUERY = 250;

/** Body of the `chatbans.get` message. */
export class PlayerChatBansQueryDto implements PlayerChatBansQuery {
  @ApiProperty({
    type: String,
    isArray: true,
    description: 'Steam IDs of the players to look up, as uint64 strings'
  })
  @IsArray()
  @ArrayMaxSize(MAX_PLAYER_CHAT_BANS_QUERY)
  @IsSteamCommunityID({ each: true })
  readonly steamIDs: string[];
}

export class PlayerChatBanDto extends PickType(ChatBanDto, [
  'type',
  'expiresAt'
] as const) {}

export class PlayerChatBansDto implements PlayerChatBans {
  @ApiProperty({ type: String, description: 'Steam ID of the player' })
  @IsSteamCommunityID()
  readonly steamID: string;

  @ApiProperty({
    type: Number,
    description:
      "Increases with every change to the player's bans. Ignore snapshots that aren't higher than the last one applied, as lookups and updates can arrive out of order"
  })
  @IsInt()
  readonly revision: number;

  @NestedProperty(PlayerChatBanDto, {
    isArray: true,
    required: true,
    description: "The player's active bans. Empty if they have none"
  })
  readonly bans: PlayerChatBanDto[];
}

/**
 * Response to `chatbans.get`, with an entry for every queried player, including
 * those with no bans or no account.
 */
export class PlayerChatBansListDto implements PlayerChatBansList {
  @NestedProperty(PlayerChatBansDto, { isArray: true, required: true })
  readonly players: PlayerChatBansDto[];
}
