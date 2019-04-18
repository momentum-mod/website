'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('runSession', {
		id: {
			type: type.BIGINT.UNSIGNED,
			primaryKey: true,
			autoIncrement: true
		},
		trackNum: type.TINYINT.UNSIGNED,
		zoneNum: type.TINYINT.UNSIGNED,
	})
};
