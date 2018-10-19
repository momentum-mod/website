'use strict';
const express = require('express'),
	router = express.Router(),
	authMiddleware = require('../../middlewares/auth'),
	errorCtrl = require('../../controllers/error'),
	userCtrl = require('../../controllers/users'),
	actCtrl = require('../../controllers/activity');

router.route('/')
	.get(userCtrl.getAll)
	.all(errorCtrl.send405);

router.route('/:userID')
	.get(userCtrl.get)
	.patch([authMiddleware.requireLogin], userCtrl.update)
	.all(errorCtrl.send405);

router.route('/:userID/profile')
	.get(userCtrl.getProfile)
	.patch([authMiddleware.requireLogin], userCtrl.updateProfile)
	.all(errorCtrl.send405);

router.route('/:userID/activities')
	.get(actCtrl.getAll)
	.all(errorCtrl.send405);

module.exports = router;
