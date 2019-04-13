'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('user', {
		id: {
			type: type.STRING,
			primaryKey: true
		},
		alias: type.STRING(32),
		avatar: {
			type: type.STRING,
			get() {}, // hidden (use avatarURL)
		},
		avatarURL: {
			type: type.VIRTUAL,
			get() {
				return 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/' + this.getDataValue('avatar')
			},
			set(val) {
				let newVal = val.replace('https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/', '');
				this.setDataValue('avatar', newVal);
			},
		},
		roles: {
			type: type.INTEGER,
			defaultValue: 0
		},
		bans: {
			type: type.INTEGER,
			defaultValue: 0
		},
		country: type.STRING(2),
	})
};
