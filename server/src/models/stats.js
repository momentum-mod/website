'use strict';
const { sequelize, Op, UserStats, Map, MapStats } = require('../../config/sqlize');

const findMapWithGreatestStatsColumnValue = (mapStatsColumnName) => {
	return Map.findOne({
		raw: true,
		include: [{ model: MapStats, as: 'stats' }],
		order: [[{ model: MapStats, as: 'stats' }, mapStatsColumnName, 'DESC']]
	});
}

module.exports = {

	getGlobalBaseStats: () => {
		return UserStats.findAll({
			raw: true,
			attributes: [
				[sequelize.fn('SUM', sequelize.col('totalJumps')), 'totalJumps'],
				[sequelize.fn('SUM', sequelize.col('totalStrafes')), 'totalStrafes'],
				[sequelize.fn('SUM', sequelize.col('runsSubmitted')), 'runsSubmitted']
			]
		});
	},

	getGlobalMapStats: () => {
		let globalMapStats = {};
		return MapStats.count({
			where: { totalCompletions: {[Op.ne]: 0} }
		}).then(totalCompletedMaps => {
			globalMapStats.totalCompletedMaps = totalCompletedMaps;
			return Map.count();
		}).then(totalMaps => {
			globalMapStats.totalMaps = totalMaps;
			return findMapWithGreatestStatsColumnValue('totalSubscriptions');
		}).then(topSubscribedMap => {
			globalMapStats.topSubscribedMap = topSubscribedMap;
			return findMapWithGreatestStatsColumnValue('totalPlays');
		}).then(topPlayedMap => {
			globalMapStats.topPlayedMap = topPlayedMap;
			return findMapWithGreatestStatsColumnValue('totalDownloads');
		}).then(topDownloadedMap => {
			globalMapStats.topDownloadedMap = topDownloadedMap;
			return findMapWithGreatestStatsColumnValue('totalUniqueCompletions');
		}).then(topUniquelyCompletedMap => {
			globalMapStats.topUniquelyCompletedMap = topUniquelyCompletedMap;
			return Promise.resolve(globalMapStats);
		});
	},

};
