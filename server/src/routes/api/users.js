'use strict';
const express = require('express'),
	router = express.Router(),
	validate = require('express-validation'),
	usersValidation = require('../../validations/users'),
	errorCtrl = require('../../controllers/error'),
	usersCtrl = require('../../controllers/users');

router.route('/')
	.get(validate(usersValidation.getAll), usersCtrl.getAll)
	.all(errorCtrl.send405);

router.route('/:userID')
	.get(validate(usersValidation.get), usersCtrl.get)
	.all(errorCtrl.send405);

router.route('/:userID/profile')
	.get(usersCtrl.getProfile)
	.all(errorCtrl.send405);

router.route('/:userID/activities')
	.get(validate(usersValidation.getActivities), usersCtrl.getActivities)
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

router.route('/:userID/runs')
	.get(usersCtrl.getRuns)
	.all(errorCtrl.send405);

router.param('userID', validate(usersValidation.urlParamID));

module.exports = router;
