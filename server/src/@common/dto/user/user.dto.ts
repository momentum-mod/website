import { Profile, User } from '@prisma/client';
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
    @IsDate()
    createdAt: Date;

    @ApiProperty()
    @IsDate()
    updatedAt: Date;

    private _avatar: string;

    @ApiProperty()
    get avatarURL(): string {
        // TODO: apparently steam's hosting has changed and this stuff is on cloudfare now, ask goc
        if (this.bans & EBan.BANNED_AVATAR) {
            return appConfig.baseURL + '/assets/images/blank_avatar.jpg';
        } else {
            return this._avatar
                ? `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/${this.alias}`
                : null;
        }
    }

    set avatarURL(val: string) {
        this._avatar = val?.replace('https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/', '');
    }

    @ApiProperty()
    get avatar(): string {
        return this._avatar;
    }

    @ApiProperty()
    @IsOptional()
    profile: ProfileDto;

    // TODO: UserStats in here in future as well
    constructor(_user: User, _profile?: Profile) {
        this.id = _user.id;
        this.steamID = _user.steamID;
        this.alias = _user.alias;
        this.avatarURL = _user.avatar;
        this.roles = _user.roles;
        this.bans = _user.bans;
        this.country = _user.country;
        this.createdAt = _user.createdAt;
        this.updatedAt = _user.updatedAt;

        // there should def be a better way of doing this...
        if (_profile) {
            this.profile = new ProfileDto(_profile);
        } else if ((_user as any).profile) {
            this.profile = new ProfileDto((_user as any).profile);
        }
    }

    @Exclude()
    aliasLocked: boolean;
}

export class UpdateUserDto extends PartialType(UserDto) {}
