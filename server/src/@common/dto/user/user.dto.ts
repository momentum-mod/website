import { User } from '@prisma/client';
import { appConfig } from '../../../../config/config';
import { ERole, EBan } from '../../enums/user.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDate, IsEnum, IsInt, IsISO31661Alpha2, IsOptional, IsString } from 'class-validator';
import { Exclude, Expose, Transform } from 'class-transformer';
import { IsSteamCommunityID } from '../../validators/is-steam-id.validator';
import { ProfileDto } from './profile.dto';
import { DtoUtils } from '../../utils/dto-utils';
import { MapRankDto } from '../map/mapRank.dto';

// TODO: UserStats in here in future as well
export class UserDto implements User {
    @ApiProperty({
        type: Number,
        description: 'The unique numeric ID of the user'
    })
    @IsInt()
    id: number;

    @ApiProperty({
        type: String,
        description: 'The Steam community ID (i.e. the uint64 format, not STEAM:...) of the user'
    })
    @IsSteamCommunityID()
    steamID: string;

    @ApiPropertyOptional({
        type: String,
        description:
            "The user's alias, which is either a current or previous Steam name, or something they set themselves"
    })
    @IsString()
    alias: string;

    @ApiPropertyOptional({
        enum: ERole
    })
    @IsEnum(ERole)
    roles: ERole;

    @ApiPropertyOptional({
        enum: EBan
    })
    @IsEnum(EBan)
    bans: EBan;

    @ApiPropertyOptional({
        type: String,
        description: 'Two-letter (ISO 3166-1 Alpha-2) country code for the user'
    })
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
    @IsOptional()
    @Transform(({ value }) => DtoUtils.Factory(ProfileDto, value))
    profile: ProfileDto;

    @ApiPropertyOptional({
        type: MapRankDto,
        description: 'The map rank data for the user on a specific map'
    })
    @IsOptional()
    @Transform(({ value }) => DtoUtils.Factory(MapRankDto, value))
    mapRank: MapRankDto;

    @ApiProperty()
    @IsDate()
    createdAt: Date;

    @ApiProperty()
    @IsDate()
    updatedAt: Date;

    @ApiProperty()
    @Expose()
    get avatarURL(): string {
        if (this.bans & EBan.BANNED_AVATAR) {
            return appConfig.baseURL + '/assets/images/blank_avatar.jpg';
        } else {
            return this.avatar ? 'https://avatars.cloudflare.steamstatic.com/' + this.avatar : null;
        }
    }
}

export class UpdateUserDto {
    @ApiProperty({
        required: false,
        type: String,
        description: 'The new alias to set'
    })
    // TODO: Idk what the fuck is going on here. Apparently the incoming data aren't strings??
    // @IsString()
    alias: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The new bio to set'
    })
    // @IsString()
    bio: string;
}
