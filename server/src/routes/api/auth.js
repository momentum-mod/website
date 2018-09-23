'use strict';
const express = require('express'),
	router = express.Router(),
	passport = require('passport'),
	errorCtrl = require('../../controllers/error'),
	authCtrl = require('../../controllers/auth');

router.route('/steam')
	.get(passport.authenticate('steam'), authCtrl.throughSteam)
	.post(errorCtrl.send405)
	.put(errorCtrl.send405)
	.delete(errorCtrl.send405);

router.route('/steam/return')
	.get(passport.authenticate('steam', { session: false, failureRedirect: '/' }), authCtrl.throughSteamReturn)
	.post(errorCtrl.send405)
	.put(errorCtrl.send405)
	.delete(errorCtrl.send405);

router.route('/steam/user')
	.get(errorCtrl.send405)
	.post(authCtrl.verifyUserTicket)
	.put(errorCtrl.send405)
	.delete(errorCtrl.send405);

module.exports = router;
