'use strict';
const act = require('../models/activity');

module.exports = {

	getAll: (req, res, next) => {
		if (req.params.userID) req.query.userID = req.params.userID;
		act.getAll(req.query)
		.then(activities => {
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
