'use strict';
const {
		sequelize, Op, Map, MapInfo, MapCredit, MapStats, MapFavorite, MapImage,
		MapLibraryEntry, UserMapRank, Run, User, Profile
	} = require('../../config/sqlize');

module.exports = {

	getUserFavorite: (userID, mapID) => {
		return MapFavorite.findOne({
			where: {
				userID: userID,
				mapID: mapID,
			},
			raw: true,
		});
	},

	getUserFavorites: (userID, queryParams) => {
		console.log(queryParams);
		const queryOptions = {
			distinct: true,
			where: { userID: userID },
			limit: 20,
			order: [['createdAt', 'DESC']],
			include: [
				{
					model: Map,
					as: 'map',
					where: {},
					include: []
				},
			]
		};
		if (queryParams.limit) {
			if (queryParams.limit === 0)
				delete queryOptions.limit;
			else
				queryOptions.limit = queryParams.limit;
		}
		if (queryParams.offset)
			queryOptions.offset = queryParams.offset;
		if (queryParams.search)
			queryOptions.include[0].where.name = {[Op.like]: '%' + queryParams.search + '%'};
		if (queryParams.type)
			queryOptions.include[0].where.type = queryParams.type;
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
			if (expansionNames.includes('submitter'))
				queryOptions.include[0].include.push({model: User, as: 'submitter', include: [Profile]});
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
		console.log(queryOptions);
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
				raw: true,
				transaction: t,
			}).then(([mapFavorite, created]) => {
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
