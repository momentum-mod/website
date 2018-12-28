'use strict';
const { sequelize, Op, User, Activity, Map, Profile, Notification, UserFollows } = require('../../config/sqlize'),
	queryHelper = require('../helpers/query');

const genNotifications = (activityModel, transaction) => {
	return UserFollows.findAll({
		attributes: [['followeeID', 'forUserID']],
		where: {
			followedID: activityModel.userID,
			[Op.and]: [
				sequelize.literal('notifyOn & ' + (1 << activityModel.type) + ' != 0')
			],
		},
		raw: true,
	}).then(usersToNotify => {
		if (!usersToNotify.length)
			return Promise.resolve();
		const notifications = usersToNotify;
		for (let i = 0; i < notifications.length; i++) {
			notifications[i].activityID = activityModel.id;
		}
		return Notification.bulkCreate(notifications, {
			transaction: transaction,
		});
	});
};

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

	getAll: (queryParams) => {
		const queryOptions = {
			where: {},
			include: [{
				model: User,
				include: [Profile]
			}],
			limit: 10,
			order: [['createdAt', 'DESC']]
		};
		if (queryParams.limit && !isNaN(queryParams.limit))
			queryOptions.limit = Math.min(Math.max(parseInt(queryParams.limit), 1), 20);
		if (queryParams.offset && !isNaN(queryParams.offset))
			queryOptions.offset = Math.min(Math.max(parseInt(queryParams.offset), 0), 5000);
		if (queryParams.userID)
			queryOptions.where.userID = queryParams.userID;
		if (queryParams.data)
			queryOptions.where.data = queryParams.data;
		if (queryParams.type)
			queryOptions.where.type = queryParams.type;
		return Activity.findAll(queryOptions);
	},

	create: (activity, transaction) => {
		return Activity.create(activity, transaction)
		.then(act => {
			return genNotifications(act, transaction);
		});
	},

};
