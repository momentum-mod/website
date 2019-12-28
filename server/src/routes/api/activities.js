'use strict';
const express = require('express'),
	router = express.Router(),
	{ celebrate } = require('celebrate'),
	activitiesValidation = require('../../validations/activities'),
	errorCtrl = require('../../controllers/error'),
	actCtrl = require('../../controllers/activities');

router.route('/')
	.get(celebrate(activitiesValidation.getAll), actCtrl.getAll)
	.all(errorCtrl.send405);

module.exports = router;
