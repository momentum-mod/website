'use strict';
const run = require('../models/run'),
	user = require('../models/user');

module.exports = {

	getAll: (req, res, next) => {
		req.query.mapID = req.params.mapID;
		run.getAll(req.query)
		.then(results => {
			res.json({
				count: results.count,
				runs: results.rows
			});
		}).catch(next);
	},

	getByID: (req, res, next) => {
		if (req.params.runID === 'friends') {
			user.getSteamFriendIDs(req.user.id)
				.then(steamIDs => {
					req.query.playerIDs = steamIDs.join(',');
					module.exports.getAll(req, res, next);
				}).catch(next);
		} else {
			if (req.params.mapID)
				req.query.mapID = req.params.mapID;
			run.getByID(req.params.runID, req.query).then(run => {
				if (!run) {
					const err = new Error('Run not found');
					err.status = 404;
					next(err);
				}
				res.json(run);
			}).catch(next);
		}
	},

	create: (req, res, next) => {
		if (req.body && Buffer.isBuffer(req.body)) {
			run.create(req.params.mapID, req.user.id, Buffer.from(req.body))
			.then(runResults => {
				res.json(runResults);
			}).catch(next);
		} else {
			const err = new Error('Bad Request');
			err.status = 400;
			next(err);
		}
	},

	download: (req, res, next) => {
		run.getFilePath(req.params.runID)
		.then(path => {
			if (!path)
				return next(run.genNotFoundErr());
			res.download(path);
		}).catch(next);
	}

};
