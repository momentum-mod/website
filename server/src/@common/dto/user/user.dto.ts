import { User } from '@prisma/client';
import { appConfig } from '../../../../config/config';
import { ERole, EBan } from '../../enums/user.enum';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsDate, IsEnum, IsInt, IsISO31661Alpha2, IsOptional, IsString } from 'class-validator';
import { Exclude } from 'class-transformer';
import { IsSteamCommunityID } from '../../validators/is-steam-id.validator';
import { ProfileDto } from './profile.dto';

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
    @IsString()
    avatarURL: string;

    @ApiProperty()
    @IsOptional()
    profile: ProfileDto;

    @Exclude()
    aliasLocked: boolean;

    @ApiProperty()
    @IsDate()
    createdAt: Date;

    @ApiProperty()
    @IsDate()
    updatedAt: Date;

    // TODO: UserStats in here in future as well
    constructor(_user: User, _profile?: ProfileDto) {
        this.id = _user.id;
        this.steamID = _user.steamID;
        this.alias = _user.alias;
        this.roles = _user.roles;
        this.bans = _user.bans;
        this.country = _user.country;
        this.createdAt = _user.createdAt;
        this.updatedAt = _user.updatedAt;

        if (this.bans & EBan.BANNED_AVATAR) {
            this.avatarURL = appConfig.baseURL + '/assets/images/blank_avatar.jpg';
        } else {
            this.avatarURL = _user.avatar ? 'https://avatars.cloudflare.steamstatic.com/' + _user.avatar : null;
        }

        if (_profile) this.profile = _profile;
    }

    get avatar(): string {
        return this.avatarURL.replace('https://avatars.cloudflare.steamstatic.com/', '');
    }
}

export class UpdateUserDto extends PartialType(UserDto) {}
