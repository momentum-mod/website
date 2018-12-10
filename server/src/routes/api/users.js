'use strict';
const express = require('express'),
	router = express.Router(),
	errorCtrl = require('../../controllers/error'),
	usersCtrl = require('../../controllers/users');

router.route('/')
	.get(usersCtrl.getAll)
	.all(errorCtrl.send405);

router.route('/:userID')
	.get(usersCtrl.get)
	.all(errorCtrl.send405);

router.route('/:userID/profile')
	.get(usersCtrl.getProfile)
	.all(errorCtrl.send405);

router.route('/:userID/activities')
	.get(usersCtrl.getActivities)
	.all(errorCtrl.send405);

router.route('/:userID/followers')
	.get(usersCtrl.getFollowers)
	.all(errorCtrl.send405);

router.route('/:userID/follows')
	.get(usersCtrl.getFollowed)
	.all(errorCtrl.send405);

router.route('/:userID/credits')
	.get(usersCtrl.getCredits)
	.all(errorCtrl.send405);

module.exports = router;
