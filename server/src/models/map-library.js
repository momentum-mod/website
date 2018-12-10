'use strict';
const { sequelize, MapLibrary, Map, MapInfo, MapCredit, MapStats,
	MapFavorite, User, Profile } = require('../../config/sqlize');

module.exports = {

	getUserLibrary: (userID, context) => {
		const queryContext = {
			distinct: true,
			where: { userID: userID },
			limit: 20,
			order: [['createdAt', 'DESC']],
			include: [
				{
					model: Map,
					include: [
						{
							model: MapInfo,
							as: 'info'
						},
						{
							model: MapCredit,
							as: 'credits',
						}
					]
				},
			]
		};
		if (context.limit && !isNaN(context.limit))
			queryContext.limit = Math.min(Math.max(parseInt(context.limit), 1), 20);
		if (context.offset && !isNaN(context.offset))
			queryContext.offset = Math.min(Math.max(parseInt(context.offset), 0), 5000);
		if (context.expand) {
			const expansionNames = context.expand.split(',');
			if (expansionNames.includes('submitter'))
				queryContext.include[0].include.push({ model: User, as: 'submitter', include: [Profile] });
			if (expansionNames.includes('favorite'))
				queryContext.include[0].include.push({ model: MapFavorite, as: 'favorites' });
			if (expansionNames.includes('libraryEntry'))
				queryContext.include[0].include.push({ model: MapLibrary, as: 'libraryEntries' });
		}
		return MapLibrary.findAndCountAll(queryContext);
	},

	removeMapFromLibrary: (userID, mapID) => {
		return sequelize.transaction(t => {
			return MapLibrary.destroy({
				where: {
					userID: userID,
					mapID: mapID
				},
				transaction: t
			}).then(rowsAffected => {
				if (!rowsAffected)
					return Promise.resolve();
				return MapStats.update({
					totalSubscriptions: sequelize.literal('totalSubscriptions - 1')
				}, {
					where: { mapID: mapID },
					transaction: t
				});
			});
		});
	},

	addMapToLibrary: (userID, mapID) => {
		return sequelize.transaction(t => {
			let mapLibModel = null;
			return MapLibrary.findOrCreate({
				where: {
					userID: userID,
					mapID: mapID
				},
				transaction: t
			}).spread((mapLibEntry, created) => {
				mapLibModel = mapLibEntry;
				if (!created)
					return Promise.resolve();
				return MapStats.update({
					totalSubscriptions: sequelize.literal('totalSubscriptions + 1')
				}, {
					where: { mapID: mapID },
					transaction: t
				});
			}).then(() => {
				return Promise.resolve(mapLibModel);
			});
		});
	},

	isMapInLibrary: (userID, mapID) => {
		return MapLibrary.find({
			where: {
				userID: userID,
				mapID: mapID,
			}
		});
	}
};
