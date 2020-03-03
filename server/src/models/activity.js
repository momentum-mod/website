'use strict';
const { sequelize, Op, User, Activity, Profile, Notification, UserFollows, MapNotify, Run } = require('../../config/sqlize');

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
		if (activityModel.type == 4 || activityModel.type == 5) { // If the activity was related to a WR or PB, we need to check for map notifications
			return Run.findByPk(activityModel.data).then(run => {
				return MapNotify.findAll({
					attributes: [['followeeID', 'forUserID']],
					where: {
						mapID: run.mapID,
						[Op.and]: [
							sequelize.literal('notifyOn & ' + (1 << activityModel.type) + ' != 0')
						],
					},
					raw: true,
					transaction: transaction,
				}).then(usersToMapNotify => {
					if (!usersToNotify.length) { // If there were no other notifications we can just return the map notifications
						usersToNotify = usersToMapNotify;
						return usersToNotify;
					}
					else if (usersToMapNotify.length) { // Eliminates duplicate notifications
						for (i = 0; i < usersToMapNotify.length; i++) { 
							var count = 0;
							for (j = 0; j < usersToNotify.length; j++) {
								if (usersToMapNotify[i].forUserID == usersToNotify[j].forUserID) {
									count += 1;
									break;
								}
							}
							if (count == 0)
								usersToNotify.push(usersToMapNotify[i]);
						}
						return usersToNotify;
					}
				});
			})
		} else
			return usersToNotify;
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
		return Activity.create(activity, { transaction: transaction }).then(act => {
			return genNotifications(act, transaction);
		});
	},

};
