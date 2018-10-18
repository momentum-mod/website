'use strict';
const express = require('express'),
    router = express.Router(),
	user = require('../models/user'),
	map = require('../models/map');

module.exports = {

	updateUser: (req, res, next) => {
		user.update(req.params.userID, req.body)
		.then(() => {
			res.sendStatus(204);
		}).catch(next);
	},

	updateMap: (req, res, next) => {
		map.update(req.params.mapID, req.body)
		.then(() => {
			res.sendStatus(204);
		}).catch(next);
	}

}
