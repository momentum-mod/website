'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('runZoneStats', {
		zoneNum: type.SMALLINT.UNSIGNED,
		jumps: type.INTEGER.UNSIGNED,
		strafes: type.INTEGER.UNSIGNED,
		strafeSyncAvg: type.FLOAT,
		strafeSyncAvg2: type.FLOAT,
		enterTime: type.FLOAT,
		totalTime: type.FLOAT,
		velMax3D: type.FLOAT,
		velMax2D: type.FLOAT,
		velAvg3D: type.FLOAT,
		velAvg2D: type.FLOAT,
		enterSpeed3D: type.FLOAT,
		enterSpeed2D: type.FLOAT,
		exitSpeed3D: type.FLOAT,
		exitSpeed2D: type.FLOAT,
	})
};
