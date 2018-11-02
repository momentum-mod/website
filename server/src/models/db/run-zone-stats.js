'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('runZoneStats', {
		zoneNum: type.SMALLINT.UNSIGNED,
		jumps: type.INTEGER.UNSIGNED,
		strafes: type.INTEGER.UNSIGNED,
		avgVel: type.FLOAT,
		// TODO: finish me
	})
};
