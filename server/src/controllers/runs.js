'use strict';
const run = require('../models/run'),
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
		if (req.params.mapID)
			req.query.mapID = req.params.mapID;
		run.getByID(req.params.runID, req.query).then(run => {
			if (run)
				return res.json(run);
			next(new ServerError(404, 'Run not found'));
		}).catch(next);
	},

	download: (req, res, next) => {
		run.getFilePath(req.params.runID).then(path => {
			if (path)
				return res.download(path);
			next(new ServerError(404, 'Run not found'));
		}).catch(next);
	}

};
