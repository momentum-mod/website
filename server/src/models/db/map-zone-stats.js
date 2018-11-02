'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('mapZoneStats', {
		zoneNum: type.INTEGER.UNSIGNED,
		timePlayed: type.BIGINT.UNSIGNED,
		// TODO finishme!
	})
};
