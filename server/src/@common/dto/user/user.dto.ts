import { User } from '@prisma/client';
import { appConfig } from 'config/config';
import { ERole, EBan } from '../../enums/user.enum';

export class UserDto implements User {
    id: number;
    steamID: string;
    alias: string;
    aliasLocked: boolean;
    private _avatar: string;
    roles: ERole;
    bans: EBan;
    country: string;
    createdAt: Date;
    updatedAt: Date;

    get avatarURL(): string {
        const bans = this.bans;
        const isAvatarBanned = bans & (1 << 2); // TODO: Refactor however needed to use Ban 'enum' (cyclic dep issue occurs when requiring user model in this file)
        if (isAvatarBanned) {
            return appConfig.baseURL + '/assets/images/blank_avatar.jpg';
        } else {
            const avatar = this._avatar;
            return avatar ? `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/${avatar}` : null;
        }
    }
    set avatarURL(val: string) {
        const newVal = val?.replace('https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/', '');
        this._avatar = newVal;
    }

    get avatar(): string {
        return this._avatar;
    }

    constructor(_user: User) {
        if (_user == null) {
            return;
        }

        this.id = _user.id;
        this.steamID = _user.steamID;
        this.alias = _user.alias;
        this.aliasLocked = _user.aliasLocked;
        this.avatarURL = _user.avatar;
        this.roles = _user.roles;
        this.bans = _user.bans;
        this.country = _user.country;
        this.createdAt = _user.createdAt;
        this.updatedAt = _user.updatedAt;
    }
}
