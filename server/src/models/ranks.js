'use strict';
const { User, Run, UserMapRank, Op } = require('../../config/sqlize'),
	ServerError = require('../helpers/server-error'),
	queryHelper = require('../helpers/query');

const addParams = (queryOptions, queryParams) => {
	if (queryParams.track)
		queryOptions.trackNum = queryParams.track;
	if (queryParams.zone)
		queryOptions.zoneNum = queryParams.zone;
	if (queryParams.flags)
		queryOptions.flags = queryParams.flags;
};

module.exports = {

	getAround: (userID, mapID, queryParams) => {
		const queryOptions = {
			mapID: mapID,
			userID: userID,
			trackNum: 0,
			zoneNum: 0,
			flags: 0,
		};
		addParams(queryOptions, queryParams);

		return UserMapRank.findOne({
			where: queryOptions,
			raw: true,
		}).then(userMapRank => {
			if (!userMapRank) // They don't have a time, error out
				return Promise.reject(new ServerError(403, 'No personal best detected'));

			delete queryOptions.userID;

			const query = {
				where: queryOptions,
				order: [
					['rank', 'ASC'],
				],
				include: [Run, User],
				offset: Math.max(userMapRank.rank - 5, 0),
				limit: 11, // 5 + yours + 5
				attributes: ['rank']
			};

			if (queryParams.limit)
				query.limit = queryParams.limit;

			return UserMapRank.findAndCountAll(query);
		});
	},

	getByRank: (rankNum, queryParams) => {
		const queryOptions = {
			mapID: mapID,
			trackNum: 0,
			zoneNum: 0,
			flags: 0,
		};
		addParams(queryOptions, queryParams);

		queryOptions.rank = rankNum;

		return UserMapRank.findOne({
			where: queryOptions,
			include: [Run, User],
		});
	},

	getAll: (queryParams) => {
		const queryOptions = {
			distinct: true,
			where: {
				flags: 0,
			},
			limit: 10,
			include: [Run, {model: User, where: {}}],
			order: [['rank', 'ASC']],
		};
		if (queryParams.limit)
			queryOptions.limit = queryParams.limit;
		if (queryParams.offset)
			queryOptions.offset = queryParams.offset;
		if (queryParams.mapID)
			queryOptions.where.mapID = queryParams.mapID;
		if (queryParams.playerID)
			queryOptions.include[1].where.steamID = queryParams.playerID;
		if (queryParams.playerIDs)
			queryOptions.include[1].where.steamID = { [Op.in]: queryParams.playerIDs.split(',') };
		if (queryParams.flags)
			queryOptions.where.flags = parseInt(queryParams.flags) || 0;
		if (queryParams.order) {
			if (queryParams.order === 'date')
				queryOptions.order = [['createdAt', 'DESC']];
		}
		queryHelper.addExpansions(queryOptions, queryParams.expand, ['map', 'mapWithInfo']);
		return UserMapRank.findAndCountAll(queryOptions);
	},

};
