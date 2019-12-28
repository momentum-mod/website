'use strict';
const express = require('express'),
	router = express.Router(),
	{ celebrate } = require('celebrate'),
	usersValidation = require('../../validations/users'),
	errorCtrl = require('../../controllers/error'),
	usersCtrl = require('../../controllers/users');

router.route('/')
	.get(celebrate(usersValidation.getAll), usersCtrl.getAll)
	.all(errorCtrl.send405);

router.route('/:userID')
	.get(celebrate(usersValidation.get), usersCtrl.get)
	.all(errorCtrl.send405);

router.route('/:userID/profile')
	.get(usersCtrl.getProfile)
	.all(errorCtrl.send405);

router.route('/:userID/activities')
	.get(celebrate(usersValidation.getActivities), usersCtrl.getActivities)
	.all(errorCtrl.send405);

router.route('/:userID/followers')
	.get(usersCtrl.getFollowers)
	.all(errorCtrl.send405);

router.route('/:userID/follows')
	.get(usersCtrl.getFollowed)
	.all(errorCtrl.send405);

router.route('/:userID/credits')
	.get(celebrate(usersValidation.getCredits), usersCtrl.getCredits)
	.all(errorCtrl.send405);

router.route('/:userID/runs')
	.get(celebrate(usersValidation.getRuns), usersCtrl.getRuns)
	.all(errorCtrl.send405);

router.param('userID', celebrate(usersValidation.urlParamID));

module.exports = router;
