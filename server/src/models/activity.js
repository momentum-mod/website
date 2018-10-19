'use strict';
const { Op, User, Activity, Map } = require('../../config/sqlize');

const ACTIVITY_TYPES = Object.freeze({
	ALL: 0,
	MAP_SUBMITTED: 1,
	PB_ACHIEVED: 2,
	WR_ACHIEVED: 3,
});

module.exports = {
	ACTIVITY_TYPES,

	getAll: (context) => {
		const queryContext = {
			where: {},
			offset: parseInt(context.page) || 0,
			limit: parseInt(context.limit) || 10,
			order: [
				['createdAt', 'DESC']
			]
		};
		if (context.userID) queryContext.where.userID = context.userID;
		if (context.data) queryContext.where.data = context.data;
		if (context.type) queryContext.where.type = context.type;
		return Activity.findAll(queryContext);
	},

	getFollowedActivities: (userID) => {
		return Promise.resolve(); // TODO implement after following table added
	}

};
