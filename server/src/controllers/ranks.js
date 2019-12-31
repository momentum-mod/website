'use strict';
const ranks = require('../models/ranks'),
	user = require('../models/user'),
	ServerError = require('../helpers/server-error');

module.exports = {

	getAll: (req, res, next) => {
		req.query.mapID = req.params.mapID;
		ranks.getAll(req.query).then(results => {
			res.json({
				count: results.count,
				ranks: results.rows
			});
		}).catch(next);
	},

	getByRank: (req, res, next) => {
		if (req.params.rankNum === 'friends') {
			user.getSteamFriendIDs(req.user.steamID).then(steamIDs => {
				steamIDs.push(req.user.steamID);
				req.query.playerIDs = steamIDs.join(',');
				module.exports.getAll(req, res, next);
			}).catch(next);
		} else if (req.params.rankNum === 'around') {
			module.exports.getAroundUser(req, res, next);
		} else {
			if (req.params.mapID)
				req.query.mapID = req.params.mapID;

			ranks.getByRank(req.params.rankNum, req.query).then(rank => {
				if (rank)
					return res.json(rank);
				next(new ServerError(404, 'Run not found'));
			}).catch(next);
		}
	},

	getAroundUser: (req, res, next) => {
		ranks.getAround(req.user.id, req.params.mapID, req.query).then(runs => {
			res.json({
				count: runs.count,
				ranks: runs.rows
			})
		}).catch(next);
	},

};
