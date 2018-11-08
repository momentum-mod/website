'use strict';
const express = require('express'),
	router = express.Router(),
	passport = require('passport'),
	errorCtrl = require('../../controllers/error'),
	authCtrl = require('../../controllers/auth');

router.route('/steam')
	.get(passport.authenticate('steam'), authCtrl.throughSteam)
	.all(errorCtrl.send405);

router.route('/steam/return')
	.get(passport.authenticate('steam', { session: false, failureRedirect: '/' }), authCtrl.throughSteamReturn)
	.all(errorCtrl.send405);

router.route('/steam/user')
	.post(authCtrl.verifyUserTicket)
	.all(errorCtrl.send405);

module.exports = router;
