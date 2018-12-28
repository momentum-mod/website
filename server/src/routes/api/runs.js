'use strict';
const express = require('express'),
	router = express.Router(),
	validate = require('express-validation'),
	runsValidation = require('../../validations/runs'),
	errorCtrl = require('../../controllers/error'),
	runCtrl = require('../../controllers/runs');

router.route('/')
	.get(validate(runsValidation.getAll), runCtrl.getAll)
	.all(errorCtrl.send405);

router.route('/:runID')
	.get(runCtrl.getByID)
	.all(errorCtrl.send405);

router.route('/:runID/download')
	.all(errorCtrl.send405);

router.param('runID', validate(runsValidation.urlParamID));

module.exports = router;
