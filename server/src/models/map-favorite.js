'use strict';
const { sequelize, Map, MapInfo, MapCredit, MapStats, MapFavorite, MapImage,
	MapLibraryEntry, UserMapRank, Run, User } = require('../../config/sqlize');

module.exports = {

	getUserFavorite: (userID, mapID) => {
		return MapFavorite.find({
			where: {
				userID: userID,
				mapID: mapID,
			}
		});
	},

	getUserFavorites: (userID, queryParams) => {
		const queryOptions = {
			distinct: true,
			where: { userID: userID },
			limit: 20,
			order: [['createdAt', 'DESC']],
			include: [
				{
					model: Map,
					as: 'map',
					include: []
				},
			]
		};
		if (queryParams.limit && !isNaN(queryParams.limit)) {
			if (queryParams.limit === 0)
				delete queryOptions.limit;
			else
				queryOptions.limit = Math.min(Math.max(parseInt(queryParams.limit), 1), 20);
		}
		if (queryParams.offset && !isNaN(queryParams.offset))
			queryOptions.offset = Math.min(Math.max(parseInt(queryParams.offset), 0), 5000);
		if (queryParams.expand) {
			const expansionNames = queryParams.expand.split(',');
			if (expansionNames.includes('info')) {
				queryOptions.include[0].include.push({
					model: MapInfo,
					as: 'info'
				});
			}
			if (expansionNames.includes('credits')) {
				queryOptions.include[0].include.push({
					model: MapCredit,
					as: 'credits',
					include: [User],
				});
			}
			if (expansionNames.includes('thumbnail')) {
				queryOptions.include[0].include.push({
					model: MapImage,
					as: 'thumbnail',
				});
			}
			if (expansionNames.includes('inLibrary')) {
				queryOptions.include[0].include.push({
					model: MapLibraryEntry,
					as: 'libraryEntries',
					where: { userID: userID },
					required: false,
				});
			}
			if (expansionNames.includes('personalBest')) {
				queryOptions.include[0].include.push({
					model: UserMapRank,
					as: 'personalBest',
					where: { userID: userID },
					include: [Run, User],
					required: false,
				});
			}
			if (expansionNames.includes('worldRecord')) {
				queryOptions.include[0].include.push({
					model: UserMapRank,
					as: 'worldRecord',
					where: { rank: 1 },
					include: [Run, User],
					required: false,
				});
			}
		}
		return MapFavorite.findAndCountAll(queryOptions);
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
