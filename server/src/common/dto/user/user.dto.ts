import { User } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import {
    IsDateString,
    IsDefined,
    IsInt,
    IsISO31661Alpha2,
    IsOptional,
    IsString,
    ValidateNested
} from 'class-validator';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { IsSteamCommunityID } from '../../validators/is-steam-id.validator';
import { ProfileDto } from './profile.dto';
import { MapRankDto } from '../map/map-rank.dto';
import { DtoFactory } from '../../utils/dto.utility';
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

    @Exclude()
    aliasLocked: boolean;

    @Exclude()
    avatar: string;

    @ApiProperty({ description: "The user's profile" })
    @Transform(({ value }) => DtoFactory(ProfileDto, value))
    @ValidateNested()
    profile: ProfileDto;

    @ApiPropertyOptional({ description: "The user's roles" })
    @Transform(({ value }) => DtoFactory(RolesDto, value))
    @ValidateNested()
    roles: RolesDto;

    @ApiPropertyOptional({ description: "The user's bans" })
    @Transform(({ value }) => DtoFactory(BansDto, value))
    @ValidateNested()
    bans: BansDto;

    @ApiProperty({ description: 'The map rank data for the user on a specific map' })
    @Transform(({ value }) => DtoFactory(MapRankDto, value))
    @ValidateNested()
    mapRank: MapRankDto;

    @ApiProperty()
    @IsDefined()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDefined()
    @IsDateString()
    updatedAt: Date;

    @ApiProperty()
    @Expose()
    get avatarURL(): string {
        if (this.bans?.avatar) {
            return Config.url.base + '/assets/images/blank_avatar.jpg';
        } else {
            return this.avatar ? 'https://avatars.cloudflare.steamstatic.com/' + this.avatar : null;
        }
    }
}

export class CreateUserDto extends PickType(UserDto, ['alias'] as const) {}

export class UpdateUserDto {
    @ApiPropertyOptional({
        type: String,
        description: 'The new alias to set'
    })
    @IsOptional()
    @IsString()
    alias?: string;

    @ApiPropertyOptional({
        type: String,
        description: 'The new bio to set'
    })
    @IsOptional()
    @IsString()
    bio?: string;
}

export class AdminUpdateUserDto extends UpdateUserDto {
    @ApiPropertyOptional({ description: 'The new roles to set' })
    @Transform(({ value }) => DtoFactory(UpdateRolesDto, value))
    @ValidateNested()
    roles?: UpdateRolesDto;

    @ApiPropertyOptional({ description: 'The new bans to set' })
    @Transform(({ value }) => DtoFactory(UpdateBansDto, value))
    @ValidateNested()
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
