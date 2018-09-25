'use strict';
const user = require('../models/user');

module.exports = {

	find: (req, res, next) => {
		if (req.params.userID) {
			user.find(req.params.userID).then(usr => {
				res.status(200).json(usr.toJSON());
			}).catch(next);
		} else {
			res.sendStatus(400);
		}
	},

	findOrCreate: (req, res, next) => {
		if (req.params.userID) {
			user.findOrCreate(req.params.userID, null)
				.then((usr) => {
					res.status(200).send(usr.toJSON())
				})
				.catch(next);
		}
		else {
			res.sendStatus(400);
		}
	},

	update: (req, res, next) => {
		user.update(req.params.userID, req.body)
		.then(() => {
			res.sendStatus(204);
		}).catch(next);
	}

};