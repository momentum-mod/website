'use strict';
const run = require('../models/run'),
	user = require('../models/user'),
	ServerError = require('../helpers/server-error');

module.exports = {

	getAll: (req, res, next) => {
		req.query.mapID = req.params.mapID;
		run.getAll(req.query).then(results => {
			res.json({
				count: results.count,
				runs: results.rows
			});
		}).catch(next);
	},

	getByID: (req, res, next) => {
		if (req.params.runID === 'friends') {
			user.getSteamFriendIDs(req.user.id).then(steamIDs => {
					req.query.playerIDs = steamIDs.join(',');
					module.exports.getAll(req, res, next);
				}).catch(next);
		} else if (req.params.runID === 'around') {
			module.exports.getAroundUser(req, res, next);
		} else {
			if (req.params.mapID)
				req.query.mapID = req.params.mapID;
			run.getByID(req.params.runID, req.query).then(run => {
				if (run)
					return res.json(run);
				next(new ServerError(404, 'Run not found'));
			}).catch(next);
		}
	},

	getAroundUser: (req, res, next) => {
		run.getAround(req.user.id, req.params.mapID, req.query).then(runs => {
			res.json({
				count: runs.count,
				runs: runs.rows
			})
		}).catch(next);
	},

	create: (req, res, next) => {
		if (req.body && Buffer.isBuffer(req.body)) {
			run.create(req.params.mapID, req.user.id, Buffer.from(req.body)).then(runResults => {
				res.json(runResults);
			}).catch(next);
		} else {
			next(new ServerError(400, 'Bad request'));
		}
	},

	download: (req, res, next) => {
		run.getFilePath(req.params.runID).then(path => {
			if (path)
				return res.download(path);
			next(new ServerError(404, 'Run not found'));
		}).catch(next);
	}

};
