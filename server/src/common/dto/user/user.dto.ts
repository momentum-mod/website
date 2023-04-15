import { User } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { IsISO31661Alpha2, IsOptional, IsString } from 'class-validator';
import { Exclude, Expose } from 'class-transformer';
import { IsSteamCommunityID } from '../../validators/is-steam-id.validator';
import { ProfileDto } from './profile.dto';
import { RankDto } from '../run/rank.dto';
import { CreatedAtProperty, IdProperty, NestedProperty, UpdatedAtProperty } from '@lib/dto.lib';
import { BansDto, UpdateBansDto } from './bans.dto';
import { RolesDto, UpdateRolesDto } from './roles.dto';
import { Config } from '@config/config';
import { UserStatsDto } from '@common/dto/user/user-stats.dto';

export class UserDto implements User {
    @IdProperty({ description: 'The unique numeric ID of the user' })
    readonly id: number;

    @ApiProperty({
        type: String,
        description: 'The Steam community ID (i.e. the uint64 format, not STEAM:...) of the user'
    })
    @IsOptional() // Placeholder don't have SteamIDs
    @IsSteamCommunityID()
    readonly steamID: bigint;

    @ApiProperty({
        type: String,
        description:
            "The user's alias, which is either a current or previous Steam name, or something they set themselves"
    })
    @IsString()
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
        return this.bans?.avatar || !this.avatar
            ? // TODO: We shouldn't be serving this image ourselves, use a bucket or something?
              Config.url + '/assets/images/blank_avatar.jpg'
            : `https://avatars.cloudflare.steamstatic.com/${this.avatar}_full.jpg`;
    }

    @NestedProperty(ProfileDto, { description: "The users's profile, containing information like bio and badges" })
    readonly profile: ProfileDto;

    @NestedProperty(UserStatsDto, { description: "The user's stats, containing information like XP and level" })
    readonly userStats: UserStatsDto;

    @NestedProperty(RolesDto, { description: "The user's roles" })
    readonly roles: RolesDto;

    @NestedProperty(BansDto, { description: "The user's bans" })
    readonly bans: BansDto;

    @NestedProperty(RankDto, { description: 'The map rank data for the user on a specific map' })
    readonly mapRank: RankDto;

    @CreatedAtProperty()
    readonly createdAt: Date;

    @UpdatedAtProperty()
    readonly updatedAt: Date;
}

export class CreateUserDto extends PickType(UserDto, ['alias'] as const) {}

export class UpdateUserDto {
    @ApiPropertyOptional({
        type: String,
        description: 'The new alias to set'
    })
    @IsString()
    @IsOptional()
    alias?: string;

    @ApiPropertyOptional({
        type: String,
        description: 'The new bio to set'
    })
    @IsString()
    @IsOptional()
    bio?: string;
}

export class AdminUpdateUserDto extends UpdateUserDto {
    @NestedProperty(UpdateRolesDto, { description: 'The new roles to set', required: false })
    roles?: UpdateRolesDto;

    @NestedProperty(UpdateRolesDto, { description: 'The new bans to set', required: false })
    bans?: UpdateBansDto;
}

export class MergeUserDto {
    @IdProperty({ description: 'The ID of the placeholder user to merge into the actual user' })
    placeholderID: number;

    @IdProperty({ description: 'The ID of the actual user to merge the placeholder into' })
    userID: number;
}
