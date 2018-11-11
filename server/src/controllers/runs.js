'use strict';
const run = require('../models/run');

module.exports = {

	getAll: (req, res, next) => {
		run.getAll(req.query)
		.then(runs => {
			res.json({
				runs: runs
			});
		}).catch(next);
	},

	get: (req, res, next) => {
		run.get(req.params.runID, req.query)
		.then(run => {
			if (!run) {
				const err = new Error('Run not found');
				err.status = 400;
				return next(err);
			}
			res.json(run);
		}).catch(next);
	},

	create: (req, res, next) => {
		if (req.files && req.files.runFile) {
			run.create(req.files.runFile)
			.then(runResults => {
				res.json(runResults);
			}).catch(next);
		} else {
			const err = new Error('No run file provided');
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
