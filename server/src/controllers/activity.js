'use strict';
const act = require('../models/activity');

module.exports = {

	create: (req, res, next) => {
		act.createActivity(req.body).then(act => {
			res.json(act.toJSON())
		}).catch(next);
	},

	getRecentActivities: (req, res, next) => {
		act.getRecentActivities().then(activities => {
			res.json({
				activities: activities
			});
		}).catch(next);
	},

	getUserActivities: (req, res, next) => {
		act.getActivitiesForUser(req.params.userID).then(activities => {
			res.json({
				activities: activities
			});
		}).catch(next);
	},

	getFollowedActivities: (req, res, next) => {
		res.sendStatus(501);
		// act.getFollowedActivities()
	}
};