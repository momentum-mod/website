'use strict';
const { sequelize, Map, MapInfo, MapCredit, MapStats, MapFavorite } = require('../../config/sqlize');

module.exports = {

	getUserFavorite: (userID, mapID) => {
		return MapFavorite.find({
			where: {
				userID: userID,
				mapID: mapID,
			}
		});
	},

	getUserFavorites: (userID, context) => {
		const queryContext = {
			distinct: true,
			where: { userID: userID },
			limit: 20,
			order: [['createdAt', 'DESC']],
			include: [
				{
					model: Map,
					as: 'map',
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
		return MapFavorite.findAndCountAll(queryContext);
	},

	removeMapFromFavorites: (userID, mapID) => {
		return sequelize.transaction(t => {
			return MapFavorite.destroy({
				where: {
					userID: userID,
					mapID: mapID
				},
				transaction: t
			}).then(rowsAffected => {
				if (!rowsAffected)
					return Promise.resolve();
				return MapStats.update({
					totalFavorites: sequelize.literal('totalFavorites - 1')
				}, {
					where: { mapID: mapID },
					transaction: t
				});
			});
		});
	},

	addMapToFavorites: (userID, mapID) => {
		return sequelize.transaction(t => {
			let mapFavModel = null;
			return MapFavorite.findOrCreate({
				where: {
					userID: userID,
					mapID: mapID
				},
				transaction: t
			}).spread((mapFavorite, created) => {
				mapFavModel = mapFavorite;
				if (!created)
					return Promise.resolve();
				return MapStats.update({
					totalFavorites: sequelize.literal('totalFavorites + 1')
				}, {
					where: { mapID: mapID },
					transaction: t
				});
			}).then(() => {
				return Promise.resolve(mapFavModel);
			});
		});
	},

};
