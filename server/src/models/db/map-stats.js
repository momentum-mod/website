'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('mapStats', {
		totalReviews: type.INTEGER.UNSIGNED,
		totalDownloads: type.INTEGER.UNSIGNED,
		totalSubscriptions: type.INTEGER.UNSIGNED,
		totalPlays: type.INTEGER.UNSIGNED,
		totalCompletions: type.INTEGER.UNSIGNED,
		totalUniqueCompletions: type.INTEGER.UNSIGNED,
		totalTimePlayed: type.BIGINT.UNSIGNED,
	})
};
