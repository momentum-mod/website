'use strict';
const express = require('express'),
	router = express.Router(),
	passport = require('passport'),
	errorCtrl = require('../../controllers/error'),
	authMiddleware = require('../../middlewares/auth'),
	authCtrl = require('../../controllers/auth');

router.route('/steam')
	.get(passport.authenticate('steam', { session: false }))
	.all(errorCtrl.send405);

router.route('/steam/return')
	.get(passport.authenticate('steam', { session: false, failureRedirect: '/' }), authCtrl.throughSteamReturn)
	.all(errorCtrl.send405);

router.route('/steam/user')
	.post(authCtrl.verifyUserTicket)
	.all(errorCtrl.send405);

router.route('/twitter')
	.get([authMiddleware.requireLoginQuery], passport.authorize('twit-authz'), passport.authorize('twitter'))
	.all(errorCtrl.send405);

router.route('/twitter/return')
	.get(passport.authorize('twitter'), authCtrl.twitterReturn)
	.all(errorCtrl.send405);

module.exports = router;
