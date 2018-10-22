'use strict';
const { Op, Replay } = require('../../config/sqlize'),
	config = require('../../config/config'),
	queryHelper = require('../helpers/query');

const validateRun = (runData) {
	return new Promise((resolve, reject) => {
		resolve(runData);
	});
}

module.exports = {

	get: (runID) => {
		return Promise.resolve();
	},

	create: (runData) => {
		return validateRun(runData)
		.then(() => {
			// store
		});
	}

};
