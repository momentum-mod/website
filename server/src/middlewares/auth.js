'use strict';
const passport = require('passport'),
	user = require('../models/user'),
	jwtModule = require('jsonwebtoken'),
	config = require('../../config/config');

module.exports = {

	requireLoginQuery: passport.authenticate('jwt-authz', {
		session: false,
		failWithError: true,
		passReqToCallback: true,
	}),

	requireLogin: passport.authenticate('jwt', {
		session: false,
		failWithError: true
	}),

	// Requires requireLogin to be called before
	denyGameLogin: (req, res, next) => {
		const gameAuth = req.user && req.user.gameAuth;
		if (gameAuth) {
			const err = new Error('Forbidden');
			err.status  = 403;
			return next(err);
		}
		return next();
	},

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
