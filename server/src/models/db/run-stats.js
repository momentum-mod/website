'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('runStats', {
		totalJumps: type.INTEGER.UNSIGNED,
		totalStrafes: type.INTEGER.UNSIGNED,
		// TODO finish me
	})
};
