'use strict';
const express = require('express'),
	router = express.Router(),
	authMiddleware = require('../../middlewares/auth'),
	errorCtrl = require('../../controllers/error'),
	userCtrl = require('../../controllers/user');

router.route('/')
	.get(userCtrl.get)
	.all(errorCtrl.send405);

router.route('/profile')
	.get(userCtrl.getProfile)
	.patch(userCtrl.updateProfile)
	.all(errorCtrl.send405);

router.route('/maps')
	.get(userCtrl.getSubmittedMaps)
	.all(errorCtrl.send405);

router.route('/activities')
	.get(userCtrl.getActivities)
	.all(errorCtrl.send405);

module.exports = router;
