'use strict';
const { sequelize, Op, User, Activity, Profile, Notification, UserFollows, MapNotify, Run } = require('../../config/sqlize');

const combineUsersToNotify = (activityModel, transaction, mapID, usersToNotify) => {
	return MapNotify.findAll({
		attributes: [['followeeID', 'forUserID']],
		where: {
			mapID: mapID,
			[Op.and]: [
				sequelize.literal('notifyOn & ' + (1 << activityModel.type) + ' != 0')
			],
		},
		raw: true,
		transaction: transaction,
	}).then(usersToMapNotify => {
		if (!usersToNotify || !usersToNotify.length) {
			// If there were no other notifications we can just return the map notifications
			return Promise.resolve(usersToMapNotify);
		}
		else if (usersToMapNotify && usersToMapNotify.length) {
			// Eliminate duplicate notifications
			for (let i = 0; i < usersToMapNotify.length; i++) {
				let found = false;
				for (let j = 0; j < usersToNotify.length; j++) {
					if (usersToMapNotify[i].forUserID === usersToNotify[j].forUserID) {
						found = true;
						break;
					}
				}
				if (!found)
					usersToNotify.push(usersToMapNotify[i]);
			}
			return Promise.resolve(usersToNotify);
		}
		else {
			return Promise.resolve(null);
		}
	});
};

const genNotifications = (activityModel, transaction, mapID) => {
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
		if (!mapID || (activityModel.type !== ACTIVITY_TYPES.PB_ACHIEVED && activityModel.type !== ACTIVITY_TYPES.WR_ACHIEVED)) {
			return Promise.resolve(usersToNotify);
		}
		return combineUsersToNotify(activityModel, transaction, mapID, usersToNotify);
	}).then(usersToNotify => {
		if (!usersToNotify || !usersToNotify.length)
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

	createPBActivity: (activity, transaction, mapID) => {
		return Activity.create(activity, { transaction: transaction }).then(act => {
			return genNotifications(act, transaction, mapID);
		});
	}

};
