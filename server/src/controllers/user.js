'use strict';
const user = require('../models/user'),
	map = require('../models/map'),
	activity = require('../models/activity');

module.exports = {

	get: (req, res, next) => {
		user.get(req.user.id)
		.then(user => {
			return res.json(user);
		}).catch(next);
	},

	getProfile: (req, res, next) => {
		user.getProfile(req.user.id)
		.then(profile => {
			res.json(profile);
		}).catch(next);
	},

	updateProfile: (req, res, next) => {
		user.updateProfile(req.user.id, req.body)
		.then(profile => {
			res.sendStatus(204);
		}).catch(next);
	},

	getSubmittedMaps: (req, res, next) => {
		req.query.submitterID = req.user.id;
		map.getAll(req.query)
		.then(maps => {
			res.json({
				maps: maps
			});
		}).catch(next);
	},

	getActivities: (req, res, next) => {
		req.query.userID = req.user.id;
		activity.getAll(req.query)
		.then(activities => {
			res.json({
				activities: activities
			});
		});
	}

}
