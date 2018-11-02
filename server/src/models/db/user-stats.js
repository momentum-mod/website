'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('userStats', {
		totalJumps: type.BIGINT.UNSIGNED,
		totalStrafes: type.BIGINT.UNSIGNED,
		// TODO: finish me
		rankXP: type.BIGINT.UNSIGNED,
		cosXP: type.BIGINT.UNSIGNED,
		mapsCompleted: type.INTEGER.UNSIGNED,
	})
};
