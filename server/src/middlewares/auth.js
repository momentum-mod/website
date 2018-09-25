'use strict';
const passport = require('passport'),
	user = require('../models/user');

module.exports = {

	requireLogin: passport.authenticate('jwt', {
		session: false,
		failWithError: true
	}),

	// Requires requireLogin to be called before
	requireAdmin: (req, res, next) => {
		const isAdmin = req.user && (req.user.permissions & user.Permission.ADMIN);
		if (!isAdmin) {
			const err = new Error('Forbidden');
			err.status = 403;
			return next(err);
		}
		return next();
	}

}
