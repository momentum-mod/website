'use strict';
const user = require('../models/user'),
	activity = require('../models/activity');

// TODO: handle these controller errors better!?
const genUserNotFoundErr = () => {
	const err = new Error("User Not Found");
	err.status = 404;
	return err;
}

module.exports = {

	getAll: (req, res, next) => {
		user.getAll(req.query)
		.then(users => {
	        res.json({
	        	users: users
	        });
		}).catch(next);
	},

	get: (req, res, next) => {
		user.get(req.params.userID)
		.then(user => {
			if (user) {
				return res.json(user);
			}
			next(genUserNotFoundErr());
		}).catch(next);
	},

	getProfile: (req, res, next) => {
		user.getProfile(req.params.userID)
		.then(profile => {
			if (profile) {
				res.json(profile);
			}
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
		});
	}

}
