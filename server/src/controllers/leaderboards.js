'use strict';
const leaderboard = require('../models/leaderboard');

module.exports = {

	get: (req, res, next) => {
		const err = new Error('Not implemented yet');
		return next(err);
		// leaderboard.getAll(req.params.leaderboardID, req.query)
		// .then(activities => {
		// 	res.json({
		// 		activities: activities
		// 	});
		// }).catch(next);
	},

	getAllRuns: (req, res, next) => {
		leaderboard.getAllRuns(req.query)
		.then(runs => {
			res.json({
				runs: runs
			});
		}).catch(next);
	},

	getRun: (req, res, next) => {
		leaderboard.getRun(req.params.runID)
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
			leaderboard.createRun(req.files.runFile)
			.then(leaderboardEntry => {
				res.json(leaderboardEntry);
			}).catch(next);
		} else {
			const err = new Error('No run file provided');
			err.status = 400;
			next(err);
		}
	},

	downloadRunFile: (req, res, next) => {
		leaderboard.getRunFilePath()
		.then(path => {
			res.download(path);
		}).catch(next);
	}

};
