'use strict';
const express = require('express'),
	router = express.Router(),
	errorCtrl = require('../../controllers/error'),
	runsCtrl = require('../../controllers/runs');

router.route('/')
	.post(runsCtrl.create)
	.get(runsCtrl.getAll)
	.all(errorCtrl.send405);

router.route('/:runID')
	.get(runsCtrl.get)
	.all(errorCtrl.send405);

router.route('/:runID/download')
	.get(runsCtrl.download)
	.all(errorCtrl.send405);

module.exports = router;
