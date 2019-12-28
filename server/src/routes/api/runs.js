'use strict';
const express = require('express'),
	router = express.Router(),
	{ celebrate } = require('celebrate'),
	runsValidation = require('../../validations/runs'),
	errorCtrl = require('../../controllers/error'),
	runCtrl = require('../../controllers/runs');

router.route('/')
	.get(celebrate(runsValidation.getAll), runCtrl.getAll)
	.all(errorCtrl.send405);

router.route('/:runID')
	.get(runCtrl.getByID)
	.all(errorCtrl.send405);

router.route('/:runID/download')
	.all(errorCtrl.send405);

router.param('runID', celebrate(runsValidation.urlParamID));

module.exports = router;
