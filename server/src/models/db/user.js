'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('user', {
		id: {
			type: type.STRING(20),
			primaryKey: true,
		},
		alias: type.STRING(32),
		avatar: {
			type: type.STRING,
			get() {}, // hidden (use avatarURL)
		},
		avatarURL: {
			type: type.VIRTUAL,
			get() {
				const val = this.getDataValue('avatar');
				return val ? `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/${val}` : null;
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
	})
};
