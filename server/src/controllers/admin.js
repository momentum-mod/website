'use strict';
const express = require('express'),
    router = express.Router(),
	user = require('../models/user');

module.exports = {

	updateUser: (req, res, next) => {
		user.update(req.userID, req.body)
		.then(() => {
			res.sendStatus(204);
		}).catch(next);
	},

	giveUserPermission: (req, res, next) => {
		user.addPermission(req.userID, req.permID)
		.then(() => {
			res.sendStatus(204);
		}).catch(next);
	},

	removeUserPermission: (req, res, next) => {
		user.removePermission(req.userID, req.permID)
		.then(() => {
			res.sendStatus(204);
		}).catch(next);
	}

}
