import { User } from '@prisma/client';
import { appConfig } from '../../../../config/config';
import { ERole, EBan } from '../../enums/user.enum';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsDate, IsEnum, IsInt, IsISO31661Alpha2, IsOptional, IsString } from 'class-validator';
import { Exclude, Expose, Transform } from 'class-transformer';
import { IsSteamCommunityID } from '../../validators/is-steam-id.validator';
import { ProfileDto } from './profile.dto';
import { DtoUtils } from '../../utils/dto-utils';

// TODO: UserStats in here in future as well
export class UserDto implements User {
    @ApiProperty()
    @IsInt()
    id: number;

    @ApiProperty()
    @IsSteamCommunityID()
    steamID: string;

    @ApiProperty()
    @IsString()
    alias: string;

    @ApiProperty()
    @IsEnum(ERole)
    roles: ERole;

    @ApiProperty()
    @IsEnum(EBan)
    bans: EBan;

    @ApiProperty()
    @IsISO31661Alpha2()
    country: string;

    @ApiProperty()
    @IsOptional()
    @Transform(({ value }) => new ProfileDto(value))
    profile: ProfileDto;

    @Exclude()
    aliasLocked: boolean;

    @ApiProperty()
    @IsDate()
    createdAt: Date;

    @ApiProperty()
    @IsDate()
    updatedAt: Date;

    @Exclude()
    avatar: string;

    @ApiProperty()
    @Expose()
    get avatarURL(): string {
        if (this.bans & EBan.BANNED_AVATAR) {
            return appConfig.baseURL + '/assets/images/blank_avatar.jpg';
        } else {
            return this.avatar ? 'https://avatars.cloudflare.steamstatic.com/' + this.avatar : null;
        }
    }

    constructor(_user: Partial<User>) {
        DtoUtils.ShapeSafeObjectAssign(this, _user);
    }
}

export class UpdateUserDto extends PartialType(UserDto) {}
