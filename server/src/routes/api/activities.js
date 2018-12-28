'use strict';
const express = require('express'),
	router = express.Router(),
	validate = require('express-validation'),
	activitiesValidation = require('../../validations/activities'),
	errorCtrl = require('../../controllers/error'),
	actCtrl = require('../../controllers/activities');

router.route('/')
	.get(validate(activitiesValidation.getAll), actCtrl.getAll)
	.all(errorCtrl.send405);

module.exports = router;
