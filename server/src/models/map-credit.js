'use strict';
const { Map, MapCredit, MapInfo, MapImage } = require('../../config/sqlize'),
	queryHelper = require('../helpers/query');

module.exports = {

	getCreditsByUser: (userID, queryParams) => {
		const queryOptions = {
			distinct: true,
			where: {
				userID: userID,
			},
			include: [],
			order: [['createdAt', 'DESC']],
		};
		if (queryParams.limit)
			queryOptions.limit = queryParams.limit;
		if (queryParams.offset)
			queryOptions.offset = queryParams.offset;
		if (queryParams.map)
			queryOptions.where.mapID = queryParams.map;
		const expansion = queryParams.expand.split(',');
		if (expansion.includes('map')) {
			const mapIncl = {
				model: Map,
				as: 'map',
				include: [],
			};
			if (expansion.includes('mapInfo')) {
				mapIncl.include.push({
					model: MapInfo,
					as: 'info',
				});
			}
			if (expansion.includes('mapThumbnail')) {
				mapIncl.include.push({
					model: MapImage,
					as: 'thumbnail',
				})
			}

			queryOptions.include.push(mapIncl);
		}
		return MapCredit.findAndCountAll(queryOptions);
	},

	getCredit: (mapID, mapCredID, queryParams) => {
		const allowedExpansions = ['user'];
		const queryOptions = {
			where: {
				id: mapCredID,
				mapID: mapID
			}
		};
		queryHelper.addExpansions(queryOptions, queryParams.expand, allowedExpansions);
		return MapCredit.findOne(queryOptions);
	},

	createCredit: (mapID, mapCredit) => {
		mapCredit.mapID = mapID;
		return MapCredit.create(mapCredit);
	},

	updateCredit: (mapID, mapCredID, mapCredit) => {
		return MapCredit.update(mapCredit, {
			where: {
				id: mapCredID,
				mapID: mapID
			}
		});
	},

	deleteCredit: (mapID, mapCredID) => {
		return MapCredit.destroy({
			where: {
				id: mapCredID,
				mapID: mapID
			}
		});
	},

};
