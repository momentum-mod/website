'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('user', {
		id: {
			type: type.STRING,
			primaryKey: true
		},
		permissions: {
			type: type.INTEGER,
			defaultValue: 0
		},
		country: type.STRING(2),
	})
};
