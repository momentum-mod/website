'use strict';
const user = require('../models/user'),
	map = require('../models/map'),
	activity = require('../models/activity'),
	mapCredit = require('../models/map-credit'),
	mapLibrary = require('../models/map-library'),
	mapFavorite = require('../models/map-favorite'),
	ServerError = require('../helpers/server-error');

module.exports = {

	get: (req, res, next) => {
		if (req.query.expand)
			req.query.expand = req.query.expand.replace(/stats/g, 'userStats');
		user.get(req.user.id, req.query).then(user => {
			return res.json(user);
		}).catch(next);
	},

	update: (req, res, next) => {
		user.updateAsLocal(req.user, req.body)
			.then(() => res.sendStatus(204))
			.catch(next);
	},

	getProfile: (req, res, next) => {
		user.getProfile(req.user.id).then(profile => {
			res.json(profile);
		}).catch(next);
	},

	createSocialLink: (req, res, next) => {
		user.getProfile(req.user.id).then(profile => {
			return user.createSocialLink(profile, req.params.type, req.body);
		}).then(resp => {
			res.status(201).json(resp);
		}).catch(next);
	},

	destroySocialLink: (req, res, next) => {
		user.getProfile(req.user.id).then(profile => {
			return user.destroySocialLink(profile, req.params.type);
		}).then(resp => {
			res.sendStatus(200);
		}).catch(next);
	},

	getMapCredits: (req, res, next) => {
		mapCredit.getCreditsByUser(req.user.id, req.query).then(credits => {
			res.json({
				count: credits.count,
				credits: credits.rows
			});
		}).catch(next);
	},

	getSubmittedMaps: (req, res, next) => {
		req.query.submitterID = req.user.id;
		map.getAll(req.user.id, req.query).then(results => {
			res.json({
				count: results.count,
				maps: results.rows
			});
		}).catch(next);
	},

	getSubmittedMapSummary: (req, res, next) => {
		user.getSubmittedMapSummary(req.user.id).then(results => {
			res.json(results);
		}).catch(next);
	},

	getUserLibrary: (req, res, next) => {
		mapLibrary.getUserLibrary(req.user.id, req.query).then(results => {
			res.json({
				count: results.count,
				entries: results.rows
			});
		}).catch(next);
	},

	addMapToLibrary: (req, res, next) => {
		mapLibrary.addMapToLibrary(req.user.id, req.params.mapID).then(entry => {
			res.json(entry);
		}).catch(next);
	},

	removeMapFromLibrary: (req, res, next) => {
		mapLibrary.removeMapFromLibrary(req.user.id, req.params.mapID).then(() => {
			res.json({
				mapID: req.params.mapID,
			})
		}).catch(next);
	},

	isMapInLibrary: (req, res, next) => {
		mapLibrary.isMapInLibrary(req.user.id, req.params.mapID).then(entry => {
			if (entry)
				return res.sendStatus(200);
			next(new ServerError(404, 'Map library entry not found'));
		}).catch(next);
	},

	getUserFavorite: (req, res, next) => {
		mapFavorite.getUserFavorite(req.user.id, req.params.mapID).then(favorite => {
			if (favorite)
				return res.json(favorite);
			next(new ServerError(404, 'Map favorite not found'));
		}).catch(next);
	},

	getUserFavorites: (req, res, next) => {
		mapFavorite.getUserFavorites(req.user.id, req.query).then(results => {
			res.json({
				count: results.count,
				favorites: results.rows
			});
		}).catch(next);
	},

	addMapToFavorites: (req, res, next) => {
		mapFavorite.addMapToFavorites(req.user.id, req.params.mapID).then(favorite => {
			res.json(favorite);
		}).catch(next);
	},

	removeMapFromFavorites: (req, res, next) => {
		mapFavorite.removeMapFromFavorites(req.user.id, req.params.mapID).then(() => {
			res.json({
				mapID: req.params.mapID,
			});
		}).catch(next);
	},

	getActivities: (req, res, next) => {
		req.query.userID = req.user.id;
		activity.getAll(req.query).then(activities => {
			res.json({
				activities: activities
			});
		}).catch(next);
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
		user.getNotifications(req.user.id, req.query).then(results => {
			res.json({
				count: results.count,
				notifications: results.rows
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
