'use strict';
const { MapCredit } = require('../../config/sqlize'),
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
		queryHelper.addExpansions(queryOptions, queryParams.expand, ['map', 'mapWithInfo']);
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
		return MapCredit.find(queryOptions);
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
