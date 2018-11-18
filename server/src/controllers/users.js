'use strict';
const user = require('../models/user'),
	activity = require('../models/activity');

// TODO: handle these controller errors better!?
const genUserNotFoundErr = () => {
	const err = new Error('User Not Found');
	err.status = 404;
	return err;
}

module.exports = {

	getAll: (req, res, next) => {
		user.getAll(req.query)
		.then(results => {
	        res.json({
				count: results.count,
	        	users: results.rows
	        });
		}).catch(next);
	},

	get: (req, res, next) => {
		if (req.query.expand)
			req.query.expand = req.query.expand.replace(/stats/g, 'userStats');
		user.get(req.params.userID, req.query)
		.then(user => {
			if (user)
				return res.json(user);
			next(genUserNotFoundErr());
		}).catch(next);
	},

	getProfile: (req, res, next) => {
		user.getProfile(req.params.userID)
		.then(profile => {
			if (profile)
				return res.json(profile);
			next(genUserNotFoundErr());
		}).catch(next);
	},

	updateProfile: (req, res, next) => {
		user.updateProfile(req.params.userID, req.body)
		.then(profile => {
			res.sendStatus(204);
		}).catch(next);
	},

	getActivities: (req, res, next) => {
		req.query.userID = req.params.userID;
		activity.getAll(req.query)
		.then(activities => {
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
			})
		}).catch(next);
	},

	getFollowed: (req, res, next) => {
		user.getFollowing(req.params.userID).then(result => {
			res.json({
				count: result.count,
				followed: result.rows,
			})
		}).catch(next);
	},

};
