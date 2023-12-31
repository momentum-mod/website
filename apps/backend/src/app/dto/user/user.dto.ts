import {
  Bitfield,
  MAX_BIO_LENGTH,
  MergeUser,
  Role,
  STEAM_MISSING_AVATAR,
  User
} from '@momentum/constants';
import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import {
  IsInt,
  IsISO31661Alpha2,
  IsOptional,
  IsString,
  MaxLength
} from 'class-validator';
import { Exclude, Expose } from 'class-transformer';
import { Ban } from '@momentum/constants';
import { Bitflags } from '@momentum/bitflags';
import { CreatedAtProperty, IdProperty, NestedProperty } from '../decorators';
import { IsSteamCommunityID } from '../../validators';
import { ProfileDto } from './profile.dto';
import { UserStatsDto } from './user-stats.dto';

import { UpdateSocialsDto } from './socials.dto';

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
  readonly steamID: bigint;

  @ApiProperty({
    type: String,
    description:
      "The user's alias, which is either a current or previous Steam name, or something they set themselves",
    maxLength: 32
  })
  @IsString()
  @MaxLength(32)
  readonly alias: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Two-letter (ISO 3166-1 Alpha-2) country code for the user'
  })
  @IsOptional()
  @IsISO31661Alpha2()
  readonly country: string;

  @Exclude({ toPlainOnly: true })
  readonly avatar: string;

  @ApiProperty()
  @Expose()
  @IsString()
  get avatarURL(): string {
    return `https://avatars.cloudflare.steamstatic.com/${
      Bitflags.has(this.bans, Ban.AVATAR) || !this.avatar
        ? STEAM_MISSING_AVATAR
        : this.avatar
    }_full.jpg`;
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

  @ApiProperty({ type: Number, description: "Bitfield of user's roles" })
  @IsInt()
  readonly roles: Bitfield;

  @ApiProperty({ type: Number, description: "Bitfield of user's bans" })
  @IsInt()
  readonly bans: Bitfield;

  @CreatedAtProperty()
  readonly createdAt: Date;
}

export class CreateUserDto extends PickType(UserDto, ['alias'] as const) {}

export class UpdateUserDto {
  @ApiPropertyOptional({
    type: String,
    description: 'The new alias to set'
  })
  @IsString()
  @MaxLength(32)
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
  @IsISO31661Alpha2()
  @IsOptional()
  country?: string;

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
  roles?: Bitfield<Role>;

  @ApiProperty({
    type: Number,
    description: 'The new bans to set',
    required: false
  })
  @IsInt()
  @IsOptional()
  bans?: Bitfield<Ban>;
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
