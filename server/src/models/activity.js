'use strict';

const { Op, User, Activity, Map } = require('../../config/sqlize');

var ACTIVITY_TYPES = Object.freeze({
	ALL: 0,
	MAP_SUBMITTED: 1,
	PB_ACHIEVED: 2,
	WR_ACHIEVED: 3,
});

module.exports = {
	ACTIVITY_TYPES,

	createActivity: (actObject) => {
		return Activity.create(actObject);
	},

	getActivitiesForUser: (userID) => {
		return new Promise((resolve, reject) => {
			User.findOne({where: {id: String(userID)}}).then((usr) => {
				resolve(usr.getActivities({ limit: 10 }));
			}).catch(reject);
		});
	},

	getRecentActivities() {
		return Activity.findAll({
			where: {
				createdAt: {
					[Op.lt]: new Date(),
				}
			},
			order: [
				['createdAt', 'DESC']
			],
			attributes: [
				'id', 'type', 'data', 'userID'
			]
		});
	},

};