'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('userStats', {
		totalJumps: {
			type: type.BIGINT.UNSIGNED,
			defaultValue: 0,
		},
		totalStrafes: {
			type: type.BIGINT.UNSIGNED,
			defaultValue: 0,
		},
		level: {
			type: type.SMALLINT.UNSIGNED,
			defaultValue: 1,
		},
		cosXP: {
			type: type.BIGINT.UNSIGNED,
			defaultValue: 0,
		},
		mapsCompleted: {
			type: type.INTEGER.UNSIGNED,
			defaultValue: 0,
		},
		runsSubmitted: {
			type: type.INTEGER.UNSIGNED,
			defaultValue: 0,
		}
	})
};
