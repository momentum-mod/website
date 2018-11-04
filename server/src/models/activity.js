'use strict';
const { Op, User, Activity, Map } = require('../../config/sqlize'),
	queryHelper = require('../helpers/query');

const ACTIVITY_TYPES = Object.freeze({
	ALL: 0,
	MAP_UPLOADED: 1,
	MAP_APPROVED: 2,
	REVIEW_MADE: 3,
	PB_ACHIEVED: 4,
	WR_ACHIEVED: 5,
	REPORT_FILED: 6,
	USER_JOINED: 7,
});

module.exports = {
	ACTIVITY_TYPES,

	getAll: (context) => {
		const allowedExpansions = ['user'];
		const queryContext = {
			where: {},
			offset: parseInt(context.page) || 0,
			limit: Math.min(parseInt(context.limit) || 10, 10),
			order: [
				['createdAt', 'DESC']
			]
		};
		if (context.userID) queryContext.where.userID = context.userID;
		if (context.data) queryContext.where.data = context.data;
		if (context.type) queryContext.where.type = context.type;
		queryHelper.addExpansions(queryContext, context.expand, allowedExpansions);
		return Activity.findAll(queryContext);
	},

	create: (activity) => {
		return Activity.create(activity);
	}

};
