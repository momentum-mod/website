'use strict';

const { sequelize, Op, Map, MapInfo, MapCredit, User, Profile, Activity } = require('../../config/sqlize'),
	queryHelper = require('../helpers/query'),
	config = require('../../config/config');

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
		if (queryParams.limit && !isNaN(queryParams.limit))
			queryOptions.limit = Math.min(Math.max(parseInt(queryParams.limit), 1), 20);
		if (queryParams.offset && !isNaN(queryParams.offset))
			queryOptions.offset = Math.min(Math.max(parseInt(queryParams.offset), 0), 5000);
		if (queryParams.map && !isNaN(queryParams.map))
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
