import { User } from '@prisma/client';
import { appConfig } from 'config/config';
import { ERole, EBan } from '../../enums/user.enum';
import { ActivityDto } from './activity.dto';
import { ProfileDto } from './profile.dto';

export class UserDto {
	id: number;
	steamID: string;
	alias: string;
	aliasLocked: boolean;
	private _avatar: string
	roles: ERole;
	bans: EBan;
	country: string;
	createdAt: Date;
	updatedAt: Date;	
		
    get avatarURL(): string {
		const bans = this.bans;
		const isAvatarBanned = bans & 1 << 2; // TODO: Refactor however needed to use Ban 'enum' (cyclic dep issue occurs when requiring user model in this file)
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

	constructor(
		_id?: number,
		_steamID?: string,
		_alias?: string,
		_aliasLocked?: boolean,
		_avatar?: string,
		_roles?: number,
		_bans?: number,
		_country?: string,
		_createdAt?: Date,
		_updatedAt?: Date
	) {
		this.id = _id;
		this.steamID = _steamID;
		this.alias = _alias;
		this.aliasLocked = _aliasLocked
		this.avatarURL = _avatar;
		this.roles = _roles;
		this.bans = _bans;
		this.country = _country;
		this.createdAt = _createdAt;
		this.updatedAt = _updatedAt;
	}

	convertUserToUserDto(
		_user: User
	) {
		this.id = _user.id;
		this.steamID = _user.steamID;
		this.alias = _user.alias;
		this.aliasLocked = _user.aliasLocked
		this.avatarURL = _user.avatar;
		this.roles = _user.roles;
		this.country = _user.country;
		this.createdAt = _user.createdAt;
		this.updatedAt = _user.updatedAt;
	}
}

export class UserProfileDto extends UserDto {

	profile: ProfileDto;

	constructor(_userDto: UserDto, _profile: ProfileDto) {
		super();
		this.id = _userDto.id;
		this.steamID = _userDto.steamID;
		this.alias = _userDto.alias;
		this.aliasLocked = _userDto.aliasLocked
		this.avatarURL = _userDto.avatarURL;
		this.roles = _userDto.roles;
		this.country = _userDto.country;
		this.createdAt = _userDto.createdAt;
		this.updatedAt = _userDto.updatedAt;

		this.profile = _profile;
	}
}
