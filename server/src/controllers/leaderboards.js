'use strict';
const leaderboard = require('../models/leaderboard');

module.exports = {

	getAllRuns: (req, res, next) => {
		req.query.leaderboardID = req.params.lbID;
		leaderboard.getAllRuns(req.query)
		.then(runs => {
			res.json({
				runs: runs
			});
		}).catch(next);
	},

	getRun: (req, res, next) => {
		req.query.leaderboardID = req.params.lbID;
		leaderboard.getRun(req.params.runID, req.query)
		.then(run => {
			if (!run) {
				const err = new Error('Run not found');
				err.status = 404;
				return next(err);
			}
			res.json(run);
		}).catch(next);
	},

	createRun: (req, res, next) => {
		if (req.files && req.files.runFile) {
			leaderboard.createRun(req.params.lbID, req.files.runFile)
			.then(runResults => {
				res.json(runResults);
			}).catch(next);
		} else {
			const err = new Error('No run file provided');
			err.status = 400;
			next(err);
		}
	},

	downloadRunFile: (req, res, next) => {
		leaderboard.getRunFilePath(req.params.runID)
		.then(path => {
			if (!path) {
				const err = new Error('Run not found');
				err.status = 404;
				return next(err);
			}
			res.download(path);
		}).catch(next);
	}

};
