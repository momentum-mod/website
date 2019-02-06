'use strict';
const {
	sequelize, MapLibraryEntry, Map, MapInfo, MapCredit, MapStats,
	MapFavorite, User, Profile, UserMapRank, Run, MapImage
} = require('../../config/sqlize');

module.exports = {

	getUserLibrary: (userID, queryParams) => {
		const queryOptions = {
			distinct: true,
			where: {userID: userID},
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
							include: [User]
						}
					]
				},
			]
		};
		if (queryParams.limit) {
			if (queryParams.limit === 0) {
				delete queryOptions.limit;
			} else {
				queryOptions.limit = queryParams.limit;
			}
		}
		if (queryParams.offset)
			queryOptions.offset = queryParams.offset;
		if (queryParams.expand) {
			const expansionNames = queryParams.expand.split(',');
			// TODO uncomment the following
			/*if (expansionNames.includes('gallery'))
				queryContext.include[0].include.push({ })*/
			if (expansionNames.includes('thumbnail')) {
				queryOptions.include[0].include.push({ model: MapImage, as: 'thumbnail'});
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
			if (expansionNames.includes('personalBest')) {
				queryOptions.include[0].include.push({
					model: UserMapRank,
					as: 'personalBest',
					where: { userID: userID },
					include: [Run, User],
					required: false,
				})
			}
			if (expansionNames.includes('submitter'))
				queryOptions.include[0].include.push({model: User, as: 'submitter', include: [Profile]});
			if (expansionNames.includes('inFavorites'))
				queryOptions.include[0].include.push({model: MapFavorite, as: 'favorites'});
		}
		return MapLibraryEntry.findAndCountAll(queryOptions);
	},

	removeMapFromLibrary: (userID, mapID) => {
		return sequelize.transaction(t => {
			return MapLibraryEntry.destroy({
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
					where: {mapID: mapID},
					transaction: t
				});
			});
		});
	},

	addMapToLibrary: (userID, mapID) => {
		return sequelize.transaction(t => {
			let mapLibModel = null;
			return MapLibraryEntry.findOrCreate({
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
					where: {mapID: mapID},
					transaction: t
				});
			}).then(() => {
				return Promise.resolve(mapLibModel);
			});
		});
	},

	isMapInLibrary: (userID, mapID) => {
		return MapLibraryEntry.find({
			where: {
				userID: userID,
				mapID: mapID,
			}
		});
	}
};
