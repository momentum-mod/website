'use strict';
const express = require('express'),
	router = express.Router(),
	errorCtrl = require('../../controllers/error'),
	runsCtrl = require('../../controllers/runs'),
	bodyParser = require('body-parser');

router.route('/')
	// 80 MB is the upper bound limit of ~10 hours of replay file
	.post([[bodyParser.raw({limit: '80mb'})]], runsCtrl.create)
	.get(runsCtrl.getAll)
	.all(errorCtrl.send405);

router.route('/:runID')
	.get(runsCtrl.get)
	.all(errorCtrl.send405);

router.route('/:runID/download')
	.get(runsCtrl.download)
	.all(errorCtrl.send405);

module.exports = router;
