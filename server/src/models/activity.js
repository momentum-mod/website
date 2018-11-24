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

	getAll: (context) => {
		const queryContext = {
			where: {},
			include: [{
				model: User,
				include: [Profile]
			}],
			limit: 10,
			order: [['createdAt', 'DESC']]
		};
		if (context.limit && !isNaN(context.limit))
			queryContext.limit = Math.min(Math.max(parseInt(context.limit), 1), 20);
		if (context.offset && !isNaN(context.offset))
			queryContext.offset = Math.min(Math.max(parseInt(context.offset), 0), 5000);
		if (context.userID)
			queryContext.where.userID = context.userID;
		if (context.data)
			queryContext.where.data = context.data;
		if (context.type)
			queryContext.where.type = context.type;
		return Activity.findAll(queryContext);
	},

	create: (activity, transaction) => {
		return Activity.create(activity, transaction)
		.then(act => {
			return genNotifications(act, transaction);
		});
	},

};
