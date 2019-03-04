'use strict';
const user = require('../models/user'),
	map = require('../models/map'),
	report = require('../models/report');

module.exports = {

	updateUser: (req, res, next) => {
		user.updateAsAdmin(req.user, req.params.userID, req.body).then(() => {
			res.sendStatus(204);
		}).catch(next);
	},

	updateMap: (req, res, next) => {
		map.update(req.params.mapID, req.body).then(() => {
			res.sendStatus(204);
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

}
