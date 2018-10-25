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
	}

};
