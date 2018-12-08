'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('mapStats', {
		totalReviews: {
			type: type.INTEGER.UNSIGNED,
			defaultValue: 0,
		},
		totalDownloads: {
			type: type.INTEGER.UNSIGNED,
			defaultValue: 0,
		},
		totalSubscriptions: {
			type: type.INTEGER.UNSIGNED,
			defaultValue: 0,
		},
		totalPlays: {
			type: type.INTEGER.UNSIGNED,
			defaultValue: 0,
		},
		totalFavorites: {
			type: type.INTEGER.UNSIGNED,
			defaultValue: 0,
		},
		totalCompletions: {
			type: type.INTEGER.UNSIGNED,
			defaultValue: 0,
		},
		totalUniqueCompletions: {
			type: type.INTEGER.UNSIGNED,
			defaultValue: 0,
		},
		totalTimePlayed: {
			type: type.BIGINT.UNSIGNED,
			defaultValue: 0,
		},
	})
};
