'use strict';
const { sequelize, Op, User, Activity, Profile, Notification, UserFollows } = require('../../config/sqlize');

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
		transaction: transaction,
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
		if (queryParams.limit)
			queryOptions.limit = queryParams.limit;
		if (queryParams.offset)
			queryOptions.offset = queryParams.offset;
		if (queryParams.userID)
			queryOptions.where.userID = queryParams.userID;
		if (queryParams.data)
			queryOptions.where.data = queryParams.data;
		if (queryParams.type)
			queryOptions.where.type = queryParams.type;
		return Activity.findAll(queryOptions);
	},

	create: (activity, transaction) => {
		return Activity.create(activity, {transaction: transaction}).then(act => {
			return genNotifications(act, transaction);
		});
	},

};
