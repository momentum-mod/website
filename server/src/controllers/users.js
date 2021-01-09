'use strict';
const user = require('../models/user'),
	mapCredits = require('../models/map-credit'),
	runMdl = require('../models/run'),
	activity = require('../models/activity'),
	ServerError = require('../helpers/server-error');

module.exports = {

	getAll: (req, res, next) => {
		user.getAll(req.query).then(results => {
	        res.json({
				count: results.count,
	        	users: results.rows
	        });
		}).catch(next);
	},

	get: (req, res, next) => {
		if (req.query.expand)
			req.query.expand = req.query.expand.replace(/stats/g, 'userStats');
		user.get(req.params.userID, req.query).then(user => {
			if (user)
				return res.json(user);
			next(new ServerError(404, 'User not found'));
		}).catch(next);
	},

	getProfile: (req, res, next) => {
		user.getProfile(req.params.userID).then(profile => {
			if (profile)
				return res.json(profile);
			next(new ServerError(404, 'User not found'));
		}).catch(next);
	},

	getActivities: (req, res, next) => {
		req.query.userID = req.params.userID;
		activity.getAll(req.query).then(activities => {
			res.json({
				activities: activities
			});
		}).catch(next);
	},

	getFollowers: (req, res, next) => {
		user.getFollowers(req.params.userID).then(result => {
			res.json({
				count: result.count,
				followers: result.rows,
			});
		}).catch(next);
	},

	getFollowed: (req, res, next) => {
		user.getFollowing(req.params.userID).then(result => {
			res.json({
				count: result.count,
				followed: result.rows,
			});
		}).catch(next);
	},

	getCredits: (req, res, next) => {
		mapCredits.getCreditsByUser(req.params.userID, req.query).then(result => {
			res.json({
				count: result.count,
				credits: result.rows,
			});
		}).catch(next);
	},

	getRuns: (req, res, next) => {
		req.query.playerID = req.params.userID;
		runMdl.getAll(req.query).then(result => {
			res.json({
				count: result.count,
				runs: result.rows,
			});
		}).catch(next);
	},

};
