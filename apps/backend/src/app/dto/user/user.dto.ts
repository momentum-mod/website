import {
  ActiveChatBan,
  ChatBanType,
  Flags,
  MAX_BIO_LENGTH,
  MergeUser,
  Role,
  STEAM_MISSING_AVATAR,
  User,
  NON_WHITESPACE_REGEXP,
  DateString,
  steamAvatarUrl,
  MAX_USER_ALIAS_LENGTH
} from '@momentum/constants';
import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength
} from 'class-validator';
import { Exclude, Expose } from 'class-transformer';
import { Ban } from '@momentum/constants';
import * as Bitflags from '@momentum/bitflags';
import {
  CreatedAtProperty,
  EnumProperty,
  IdProperty,
  NestedProperty
} from '../decorators';
import { IsCountryCode, IsSteamCommunityID } from '../../validators';
import { ProfileDto } from './profile.dto';
import { UserStatsDto } from './user-stats.dto';
import { UpdateSocialsDto } from './socials.dto';

// Minimal representation of an active chat/voice ban, embedded in the local
// user's GET /user response. Defined here (rather than importing the full
// ChatBanDto) so UserDto stays free of the ChatBan->User import cycle.
export class ActiveChatBanDto implements ActiveChatBan {
  @EnumProperty(ChatBanType, {
    description: 'The type of communication the ban applies to (text or voice)'
  })
  readonly type: ChatBanType;

  @ApiPropertyOptional({
    type: String,
    description: 'When the ban expires (ISO8601), or null if permanent'
  })
  @IsOptional()
  @IsDateString()
  readonly expiresAt: DateString | null;

  @ApiPropertyOptional({ type: String, description: 'The reason for the ban' })
  @IsOptional()
  @IsString()
  readonly reason: string | null;
}

export class UserDto implements User {
  @IdProperty({ description: 'The unique numeric ID of the user' })
  readonly id: number;

  @ApiProperty({
    type: String,
    description:
      'The Steam community ID (i.e. the uint64 format, not STEAM:...) of the user'
  })
  @IsOptional() // Placeholder don't have SteamIDs
  @IsSteamCommunityID()
  readonly steamID: string;

  @ApiProperty({
    type: String,
    description:
      "The user's alias, which is either a current or previous Steam name, or something they set themselves"
  })
  @IsString()
  @MaxLength(MAX_USER_ALIAS_LENGTH)
  @Matches(NON_WHITESPACE_REGEXP)
  readonly alias: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Two-letter (ISO 3166-1 Alpha-2) country code for the user'
  })
  @IsOptional()
  @IsCountryCode()
  readonly country: string | null;

  @Exclude({ toPlainOnly: true })
  readonly avatar: string;

  @ApiProperty()
  @Expose()
  @IsString()
  get avatarURL(): string {
    return steamAvatarUrl(
      Bitflags.has(this.bans, Ban.AVATAR) || !this.avatar
        ? STEAM_MISSING_AVATAR
        : this.avatar
    );
  }

  @NestedProperty(ProfileDto, {
    description:
      "The users's profile, containing information like bio and badges"
  })
  readonly profile: ProfileDto;

  @NestedProperty(UserStatsDto, {
    description: "The user's stats, containing information like XP and level"
  })
  readonly userStats: UserStatsDto;

  @ApiProperty({ type: Number, description: "Flags of user's roles" })
  @IsInt()
  readonly roles: Flags<Role>;

  @ApiProperty({ type: Number, description: "Flags of user's bans" })
  @IsInt()
  readonly bans: Flags<Ban>;

  @NestedProperty(ActiveChatBanDto, {
    isArray: true,
    required: false,
    description:
      "The local user's currently-active timed chat/voice bans. Only present " +
      'on GET /user (the local-user endpoint).'
  })
  readonly chatBans?: ActiveChatBanDto[];

  @CreatedAtProperty()
  readonly createdAt: DateString;
}

export class CreateUserDto extends PickType(UserDto, ['alias'] as const) {}

export class UpdateUserDto {
  @ApiPropertyOptional({
    type: String,
    description: 'The new alias to set'
  })
  @IsString()
  // Must allow empty string, as it's used for resetting to steam alias.
  @MaxLength(MAX_USER_ALIAS_LENGTH)
  @IsOptional()
  alias?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'The new bio to set'
  })
  @IsString()
  @MaxLength(MAX_BIO_LENGTH)
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'The country code to set (requires ISO Alpha-2 code)'
  })
  @IsCountryCode()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether we need to get a new user avatar from Steam'
  })
  @IsBoolean()
  @IsOptional()
  resetAvatar?: boolean;

  @NestedProperty(UpdateSocialsDto)
  socials: UpdateSocialsDto;
}

export class AdminUpdateUserDto extends UpdateUserDto {
  @ApiProperty({
    type: Number,
    description: 'The new roles to set',
    required: false
  })
  @IsInt()
  @IsOptional()
  roles?: Flags<Role>;

  @ApiProperty({
    type: Number,
    description: 'The new bans to set',
    required: false
  })
  @IsInt()
  @IsOptional()
  bans?: Flags<Ban>;
}

export class MergeUserDto implements MergeUser {
  @IdProperty({
    description: 'The ID of the placeholder user to merge into the actual user'
  })
  placeholderID: number;

  @IdProperty({
    description: 'The ID of the actual user to merge the placeholder into'
  })
  userID: number;
}
