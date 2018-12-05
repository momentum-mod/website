'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('mapZoneStats', {
		zoneNum: {
			type: type.SMALLINT.UNSIGNED,
			defaultValue: 0,
		},
		totalJumps: {
			type: type.INTEGER.UNSIGNED,
			defaultValue: 0,
		},
		totalStrafes: {
			type: type.INTEGER.UNSIGNED,
			defaultValue: 0,
		},
		totalTime: {
			type: type.FLOAT,
			defaultValue: 0.0,
		},
		avgStrafeSync: {
			type: type.FLOAT,
			defaultValue: 0.0,
		},
		avgStrafeSync2: {
			type: type.FLOAT,
			defaultValue: 0.0,
		},
		avgEnterTime: {
			type: type.FLOAT,
			defaultValue: 0.0,
		},
		avgVel3D: {
			type: type.FLOAT,
			defaultValue: 0.0,
		},
		avgVel2D: {
			type: type.FLOAT,
			defaultValue: 0.0,
		},
		avgVelMax3D: {
			type: type.FLOAT,
			defaultValue: 0.0,
		},
		avgVelMax2D: {
			type: type.FLOAT,
			defaultValue: 0.0,
		},
		avgVelEnter3D: {
			type: type.FLOAT,
			defaultValue: 0.0,
		},
		avgVelEnter2D: {
			type: type.FLOAT,
			defaultValue: 0.0,
		},
		avgVelExit3D: {
			type: type.FLOAT,
			defaultValue: 0.0,
		},
		avgVelExit2D: {
			type: type.FLOAT,
			defaultValue: 0.0,
		},
	})
};
