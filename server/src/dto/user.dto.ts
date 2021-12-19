import { 
	User,
	Profile
} from '@prisma/client';
import { appConfig } from 'config/config';
export class UserDto implements User {
	id: number;
	steamID: string;
	alias: string;
	aliasLocked: boolean;
	avatar: string;
	roles: number;
	bans: number;
	country: string;
	createdAt: Date;
	updatedAt: Date;	
		
    get avatarURL(): string {
		const bans = this.bans;
		const isAvatarBanned = bans & 1 << 2; // TODO: Refactor however needed to use Ban 'enum' (cyclic dep issue occurs when requiring user model in this file)
		if (isAvatarBanned) {
			return appConfig.baseURL + '/assets/images/blank_avatar.jpg';
		} else {
			const avatar = this.avatar;
			return avatar ? `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/${avatar}` : null;
		}
    }
    set avatarURL(val: string) {
		const newVal = val.replace('https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/', '');
		this.avatar = newVal;
    }
}

export interface UserProfileDto extends UserDto, Profile { }
