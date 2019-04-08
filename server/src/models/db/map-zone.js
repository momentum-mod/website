'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('mapZone', {
		zoneNum: type.TINYINT.UNSIGNED,
		zoneType: type.TINYINT.UNSIGNED,
	})
};