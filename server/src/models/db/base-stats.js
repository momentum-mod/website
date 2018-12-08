'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('baseStats', {
		id: {
			type: type.BIGINT.UNSIGNED,
			primaryKey: true,
			autoIncrement: true,
		},
		jumps: {
			type: type.INTEGER.UNSIGNED,
			defaultValue: 0,
		},
		strafes: {
			type: type.INTEGER.UNSIGNED,
			defaultValue: 0,
		},
		avgStrafeSync: {
			type: type.FLOAT,
			defaultValue: 0.0,
		},
		avgStrafeSync2: {
			type: type.FLOAT,
			defaultValue: 0.0,
		},
		enterTime: {
			type: type.FLOAT,
			defaultValue: 0.0,
		},
		totalTime: {
			type: type.FLOAT,
			defaultValue: 0.0,
		},
		velAvg3D: {
			type: type.FLOAT,
			defaultValue: 0.0,
		},
		velAvg2D: {
			type: type.FLOAT,
			defaultValue: 0.0,
		},
		velMax3D: {
			type: type.FLOAT,
			defaultValue: 0.0,
		},
		velMax2D: {
			type: type.FLOAT,
			defaultValue: 0.0,
		},
		velEnter3D: {
			type: type.FLOAT,
			defaultValue: 0.0,
		},
		velEnter2D: {
			type: type.FLOAT,
			defaultValue: 0.0,
		},
		velExit3D: {
			type: type.FLOAT,
			defaultValue: 0.0,
		},
		velExit2D: {
			type: type.FLOAT,
			defaultValue: 0.0,
		},
	})
};
