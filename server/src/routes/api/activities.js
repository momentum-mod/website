'use strict';
const express = require('express'),
	router = express.Router(),
	errorCtrl = require('../../controllers/error'),
	actCtrl = require('../../controllers/activity');


router.route('/')
	.get(actCtrl.getRecentActivities)
	.post(actCtrl.create) // TODO: REMOVEME
	.all(errorCtrl.send405);

// Note: User activities are part of the User route

router.route('/followed')
	.get(actCtrl.getFollowedActivities)
	.all(errorCtrl.send405);


module.exports = router;