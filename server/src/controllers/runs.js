'use strict';
const run = require('../models/run');

module.exports = {

	get: (req, res, next) => {
		const err = new Error('Not implemented yet');
		return next(err);
		run.getReplayFilePath()
		.then(path => {
			res.download(path);
		}).catch(next);
	},

	create: (req, res, next) => {
		const err = new Error('Not implemented yet');
		return next(err);
		run.create(/* run data here */)
		.then(() => {
			res.sendStatus(200); // return something here?
		}).catch(next);
	}

};
