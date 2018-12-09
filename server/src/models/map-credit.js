'use strict';

const { sequelize, Op, Map, MapInfo, MapCredit, User, Profile, Activity } = require('../../config/sqlize'),
	queryHelper = require('../helpers/query'),
	config = require('../../config/config');

module.exports = {
	getCreditsByUser: (userID, context) => {
		const queryContext = {
			distinct: true,
			where: {
				userID: userID,
			},
			include: [],
			order: [['createdAt', 'DESC']],
		};
		if (context.limit && !isNaN(context.limit))
			queryContext.limit = Math.min(Math.max(parseInt(context.limit), 1), 20);
		if (context.offset && !isNaN(context.offset))
			queryContext.offset = Math.min(Math.max(parseInt(context.offset), 0), 5000);
		queryHelper.addExpansions(queryContext, context.expand, ['map', 'mapWithInfo']);
		return MapCredit.findAndCountAll(queryContext);
	},

	getCredit: (mapID, mapCredID, context) => {
		const allowedExpansions = ['user'];
		const queryContext = {
			where: {
				id: mapCredID,
				mapID: mapID
			}
		};
		queryHelper.addExpansions(queryContext, context.expand, allowedExpansions);
		return MapCredit.find(queryContext);
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