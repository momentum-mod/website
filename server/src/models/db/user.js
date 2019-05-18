'use strict';

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
	}, {
		indexes: [
			{
				unique: true,
				fields: ['steamID'],
			}
		]
	})
};
