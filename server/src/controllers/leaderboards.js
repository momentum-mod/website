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
	}

};
