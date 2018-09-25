'use strict';
const user = require('../models/user');


module.exports = {

	find: (req, res, next) => {
		if (req.params.id) {
			user.find(req.params.id).then(usr => {
				res.status(200).json(usr.toJSON());
			}).catch(err => {
				console.error(err);
				res.sendStatus(500);
			});
		} else {
			res.sendStatus(400);
		}
	},

	findOrCreate: (req, res, next) => {
		if (req.params.id) {
			user.findOrCreate(req.params.id)
				.then((usr) => {
					res.status(200).send(usr.toJSON())
				})
				.catch((err) => {
					console.error(err);
					res.sendStatus(500);
				});
		}
		else {
			res.sendStatus(400);
		}
	}

};