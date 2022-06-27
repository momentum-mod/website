import { User } from '@prisma/client';
import { appConfig } from '../../../../config/config';
import { Roles, Bans } from '../../enums/user.enum';
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
import { IsEnumFlag } from '../../validators/is-enum-flag';
import { ProfileDto } from './profile.dto';
import { DtoUtils } from '../../utils/dto-utils';
import { MapRankDto } from '../map/map-rank.dto';

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
        enum: Roles,
        description: "Flags representing the user's combined roles"
    })
    @IsEnumFlag(Roles)
    roles: Roles;

    @ApiPropertyOptional({
        enum: Bans,
        description: "Flags representing the user's combined bans"
    })
    @IsEnumFlag(Bans)
    bans: Bans;

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

    @ApiPropertyOptional({
        type: ProfileDto,
        description: "The user's profile."
    })
    @Transform(({ value }) => DtoUtils.Factory(ProfileDto, value))
    @ValidateNested()
    profile?: ProfileDto;

    @ApiPropertyOptional({
        type: MapRankDto,
        description: 'The map rank data for the user on a specific map'
    })
    @IsOptional()
    @Transform(({ value }) => DtoUtils.Factory(MapRankDto, value))
    @ValidateNested()
    mapRank?: MapRankDto;

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
        if (this.bans & Bans.BANNED_AVATAR) {
            return appConfig.baseURL + '/assets/images/blank_avatar.jpg';
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
    @ApiPropertyOptional({
        enum: Roles,
        description: 'The new roles to set'
    })
    @IsOptional()
    @IsEnumFlag(Roles)
    role?: Roles;

    @ApiPropertyOptional({
        enum: Bans,
        description: 'The new bans to set'
    })
    @IsOptional()
    @IsEnumFlag(Roles)
    bans?: Roles;
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
