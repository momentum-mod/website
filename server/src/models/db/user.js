'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('user', {
		id: {
			type: type.INTEGER,
			primaryKey: true
		},
		alias: type.STRING,
		permission: type.INTEGER
	})
};