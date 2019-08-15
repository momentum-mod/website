'use strict';
const config = require('../../../config/config');

module.exports = (sequelize, type) => {
	return sequelize.define('user', {
		id: {
			type: type.INTEGER.UNSIGNED,
			primaryKey: true,
			autoIncrement: true
		},
		steamID: {
			type: type.STRING(20),
			allowNull: true,
			defaultValue: null,
		},
		alias: type.STRING(64),
		aliasLocked: { // whether or not on to update alias to match latest steam alias on login
            type: type.BOOLEAN,
            defaultValue: false,
        },
		avatar: {
			type: type.STRING,
			get() {}, // hidden (use avatarURL)
		},
		avatarURL: {
			type: type.VIRTUAL,
			get() {
				const bans = this.getDataValue('bans');
				const isAvatarBanned = bans & 1 << 2; // TODO: Refactor however needed to use Ban 'enum' (cyclic dep issue occurs when requiring user model in this file)
				if (isAvatarBanned) {
                    return config.baseUrl + '/assets/images/blank_avatar.jpg';
				} else {
					const avatar = this.getDataValue('avatar');
					return avatar ? `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/${avatar}` : null;
				}
			},
			set(val) {
				let newVal = val.replace('https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/', '');
				this.setDataValue('avatar', newVal);
			},
		},
		roles: {
			type: type.INTEGER.UNSIGNED,
			defaultValue: 0
		},
		bans: {
			type: type.INTEGER.UNSIGNED,
			defaultValue: 0
		},
		country: type.STRING(2),
	}, {
		indexes: [
			{
				unique: true,
				fields: ['steamID'],
			}
		]
	})
};
