'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('user', {
		id: {
			type: type.STRING,
			primaryKey: true
		},
		alias: type.STRING(32),
		avatarURL: type.STRING,
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
