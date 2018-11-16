'use strict';
const user = require('../models/user'),
	map = require('../models/map'),
	activity = require('../models/activity'),
	mapLibrary = require('../models/map-library');

const genMapLibraryEntryNotFound = () => {
	const err = new Error('Map Library Entry Not Found');
	err.status = 404;
	return err;
};

module.exports = {

	get: (req, res, next) => {
		user.get(req.user.id, req.query)
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

	createSocialLink: (req, res, next) => {
		user.getProfile(req.user.id).then(profile => {
			return user.createSocialLink(profile, req.params.type, req.body);
		}).then(resp => {
			res.status(201);
			res.json(resp);
		}).catch(next);
	},

	destroySocialLink: (req, res, next) => {
		user.getProfile(req.user.id).then(profile => {
			return user.destroySocialLink(profile, req.params.type);
		}).then(resp => {
			res.sendStatus(200);
		}).catch(err => {
			console.log("CAUGHT AND ERRRRPAJNDLKJ");
			next(err);
		});
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

	getUserLibrary: (req, res, next) => {
		mapLibrary.getUserLibrary(req.user.id).then(entries => {
			res.json({
				entries: entries
			});
		}).catch(next);
	},

	addMapToLibrary: (req, res, next) => {
		mapLibrary.addMapToLibrary(req.user.id, req.body.mapID).then(entry => {
			res.json({
				entry: entry,
			});
		}).catch(next);
	},

	removeMapFromLibrary: (req, res, next) => {
		mapLibrary.removeMapFromLibrary(req.user.id, req.params.mapID).then(() => {
			res.sendStatus(200)
		}).catch(next);
	},

	isMapInLibrary: (req, res, next) => {
		mapLibrary.isMapInLibrary(req.user.id, req.params.mapID).then(entry => {
			if (entry)
				res.sendStatus(200);
			next(genMapLibraryEntryNotFound());
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
	},

	checkFollowStatus: (req, res, next) => {
		user.checkFollowStatus(req.user.id, req.params.userID).then(result => {
			if (result)
				res.json(result);
			else
				res.sendStatus(404);
		}).catch(next);
	},

	followUser: (req, res, next) => {
		user.followUser(req.user.id, req.body.userID).then(result => {
			res.json(result[0]);
		}).catch(next);
	},

	updateFollowStatus: (req, res, next) => {
		user.updateFollowStatus(req.user.id, req.params.userID, req.body.notifyOn).then(() => {
			res.sendStatus(204);
		}).catch(next);
	},

	unfollowUser: (req, res, next) => {
		user.unfollowUser(req.user.id, req.params.userID).then(() => {
			res.sendStatus(200);
		}).catch(next);
	},


	getNotifications: (req, res, next) => {
		user.getNotifications(req.user.id).then(result => {
			res.json({
				notifications: result
			});
		}).catch(next);
	},

	updateNotification: (req, res, next) => {
		user.updateNotification(req.user.id, req.params.notifID, req.body.read).then(() => {
			res.sendStatus(204);
		}).catch(next);
	},

	deleteNotification: (req, res, next) => {
		user.deleteNotification(req.user.id, req.params.notifID).then(() => {
			res.sendStatus(200);
		}).catch(next);

	},

	getFollowedActivities: (req, res, next) => {
		user.getFollowedActivities(req.user.id, req.query).then(activities => {
			res.json({
				activities: activities
			});
		}).catch(next);
	}

};
