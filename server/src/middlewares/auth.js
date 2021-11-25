'use strict';
const passport = require('passport'),
	user = require('../models/user'),
	ServerError = require('../helpers/server-error');

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
		if (gameAuth)
			return next(new ServerError(403, 'Forbidden'));
		next();
	},
	requireGameLogin: (req, res, next) => {
		const gameAuth = req.user && req.user.gameAuth;
		if (gameAuth)
			return next();
		next(new ServerError(403, 'Forbidden'));
	},

	// Requires requireLogin to be called before
	requireAdmin: (req, res, next) => {
		const isAdmin = req.user && ((req.user.roles & user.Role.ADMIN) !== 0);
		if (isAdmin)
			return next();
		next(new ServerError(403, 'Forbidden'));
	},

	requirePower: (req, res, next) => {
		const hasPower = req.user && ((req.user.roles & (user.Role.ADMIN | user.Role.MODERATOR)) !== 0);
		if (hasPower)
			return next();
		next(new ServerError(403, 'Forbidden'));
	},

	requireMapper: (req, res, next) => {
		const hasMapperPermissions = req.user && ((req.user.roles & (user.Role.MAPPER | user.Role.MODERATOR | user.Role.ADMIN)) !== 0);
		if (hasMapperPermissions)
			return next();
		next(new ServerError(403, 'Forbidden'));
	},

};