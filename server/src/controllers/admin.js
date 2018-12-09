'use strict';
const user = require('../models/user'),
	map = require('../models/map');

module.exports = {

	updateUser: (req, res, next) => {
		user.update(req.user, req.params.userID, req.body)
		.then(() => {
			res.sendStatus(204);
		}).catch(next);
	},

	updateMap: (req, res, next) => {
		map.update(req.params.mapID, req.body)
		.then(() => {
			res.sendStatus(204);
		}).catch(next);
	},

	getMaps: (req, res, next) => {
		map.getAll(req.user.id, req.query)
		.then(results => {
			res.json({
				count: results.count,
				maps: results.rows
			});
		}).catch(next);
	}

}
