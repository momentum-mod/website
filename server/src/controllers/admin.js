'use strict';
const user = require('../models/user'),
	userStats = require('../models/user-stats'),
	map = require('../models/map'),
	report = require('../models/report'),
	xpSystems = require('../models/xp-systems');

module.exports = {

	createUser: (req, res, next) => {
		user.createPlaceholder(req.body.alias).then(usr => {
			res.json(usr);
		}).catch(next);
	},

	deleteUser: (req, res, next) => {
		user.destroyUser(req.params.userID).then(() => {
			res.sendStatus(200);
		}).catch(next);
	},

	mergeUsers: (req, res, next) => {
		user.mergeUsers(req.body).then(() => {
			res.sendStatus(200);
		}).catch(next);
	},

	updateUser: (req, res, next) => {
		user.updateAsAdmin(req.user, req.params.userID, req.body).then(() => {
			res.sendStatus(204);
		}).catch(next);
	},

	updateAllUserStats: (req, res, next) => {
		userStats.updateAll(req.body).then(() => {
			res.sendStatus(204);
		}).catch(next);
	},

	updateMap: (req, res, next) => {
		map.update(req.params.mapID, req.body).then(() => {
			res.sendStatus(204);
		}).catch(next);
	},

	deleteMap: (req, res, next) => {
		map.delete(req.params.mapID).then(() => {
			res.sendStatus(200);
		}).catch(next);
	},

	getMaps: (req, res, next) => {
		map.getAll(req.user.id, req.query).then(results => {
			res.json({
				count: results.count,
				maps: results.rows,
			});
		}).catch(next);
	},

	getReports: (req, res, next) => {
		report.getAll(req.query).then(results => {
			res.json({
				count: results.count,
				reports: results.rows,
			});
		}).catch(next);
	},

	updateReport: (req, res, next) => {
		if ('resolved' in req.body && req.body.resolved === true)
			req.body.resolverID = req.user.id;
		report.update(req.params.reportID, req.body).then(() => {
			res.sendStatus(204);
		}).catch(next);
	},

	getXPSystems: (req, res, next) => {
		xpSystems.getXPSystems().then(systems => {
			res.json(systems);
		}).catch(next);
	},

	updateXPSystems: (req, res, next) => {
		xpSystems.updateXPSystems(req.body).then(() => {
			res.sendStatus(204);
		}).catch(next);
	},
};
