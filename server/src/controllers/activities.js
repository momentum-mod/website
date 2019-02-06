'use strict';
const act = require('../models/activity');

module.exports = {

	getAll: (req, res, next) => {
		act.getAll(req.query).then(activities => {
			res.json({
				activities: activities
			});
		}).catch(next);
	},

};
