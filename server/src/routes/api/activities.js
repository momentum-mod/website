'use strict';
const express = require('express'),
	router = express.Router(),
	errorCtrl = require('../../controllers/error'),
	actCtrl = require('../../controllers/activity');

router.route('/')
	.get(actCtrl.getAll)
	.all(errorCtrl.send405);

router.route('/followed')
	.get(actCtrl.getFollowedActivities)
	.all(errorCtrl.send405);

module.exports = router;
