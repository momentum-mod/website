'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('runSessionTimestamp', {
		id: {
			type: type.BIGINT.UNSIGNED,
			primaryKey: true,
			autoIncrement: true
		},
		zone: type.TINYINT.UNSIGNED,
		tick: type.INTEGER.UNSIGNED,
	})
};
