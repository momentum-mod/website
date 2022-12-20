import { User } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { IsDateString, IsDefined, IsInt, IsISO31661Alpha2, IsOptional, IsString } from 'class-validator';
import { Exclude, Expose, Type } from 'class-transformer';
import { IsSteamCommunityID } from '../../validators/is-steam-id.validator';
import { ProfileDto } from './profile.dto';
import { MapRankDto } from '../map/map-rank.dto';
import { NestedDto } from '@lib/dto.lib';
import { BansDto, UpdateBansDto } from './bans.dto';
import { RolesDto, UpdateRolesDto } from './roles.dto';
import { Config } from '@config/config';

// TODO: UserStats in here in future as well
export class UserDto implements User {
    @ApiProperty({
        type: Number,
        description: 'The unique numeric ID of the user'
    })
    @IsDefined()
    @IsInt()
    id: number;

    @ApiProperty({
        type: String,
        description: 'The Steam community ID (i.e. the uint64 format, not STEAM:...) of the user'
    })
    @IsOptional() // Placeholder don't have SteamIDs
    @IsSteamCommunityID()
    steamID: string;

    @ApiProperty({
        type: String,
        description:
            "The user's alias, which is either a current or previous Steam name, or something they set themselves"
    })
    @IsString()
    alias: string;

    @ApiPropertyOptional({
        type: String,
        description: 'Two-letter (ISO 3166-1 Alpha-2) country code for the user'
    })
    @IsOptional()
    @IsISO31661Alpha2()
    country: string;

    @Exclude({ toPlainOnly: true })
    avatar: string;

    @ApiProperty()
    @Expose()
    @IsString()
    get avatarURL(): string {
        return this.bans?.avatar || !this.avatar
            ? // TODO: We shouldn't be serving this image ourselves, use a bucket or something?
              Config.url.base + '/assets/images/blank_avatar.jpg'
            : `https://avatars.cloudflare.steamstatic.com/${this.avatar}_full.jpg`;
    }

    @NestedDto(ProfileDto, { description: "The users's bio, containing information like bio and badges" })
    profile: ProfileDto;

    @NestedDto(RolesDto, { description: "The user's roles" })
    roles: RolesDto;

    @NestedDto(BansDto, { description: "The user's bans" })
    bans: BansDto;

    @NestedDto(MapRankDto, { description: 'The map rank data for the user on a specific map' })
    mapRank: MapRankDto;

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
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
    @NestedDto(UpdateRolesDto, { description: 'The new roles to set', required: false })
    roles?: UpdateRolesDto;

    @NestedDto(UpdateRolesDto, { description: 'The new bans to set', required: false })
    bans?: UpdateBansDto;
}

export class MergeUserDto {
    @ApiProperty({
        description: 'The ID of the placeholder user to merge into the actual user',
        type: Number
    })
    @IsDefined()
    @IsInt()
    @Type(() => Number)
    placeholderID: number;

    @ApiProperty({
        description: 'The ID of the actual user to merge the placeholder into',
        type: Number
    })
    @IsDefined()
    @Type(() => Number)
    userID: number;
}
