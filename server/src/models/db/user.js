'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('user', {
		id: {
			type: type.BIGINT,
			primaryKey: true
		},
		alias: type.STRING,
		permission: {
			type: type.INTEGER,
			defaultValue: 0
		},
		avatar_url: type.STRING
	})
};