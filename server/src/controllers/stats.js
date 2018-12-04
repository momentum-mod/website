'use strict';
const stats = require('../models/stats');

module.exports = {

	getGlobalBaseStats: (req, res, next) => {
		stats.getGlobalBaseStats().then(baseStats => {
			res.json(baseStats[0]);
		}).catch(next);
	},

	getGlobalMapStats: (req, res, next) => {
		stats.getGlobalMapStats().then(mapStats => {
			res.json(mapStats);
		}).catch(next);
	},

};
