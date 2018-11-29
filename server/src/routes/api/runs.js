'use strict';
const express = require('express'),
	router = express.Router(),
	errorCtrl = require('../../controllers/error'),
	runCtrl = require('../../controllers/runs');

router.route('/')
	.get(runCtrl.getAll)
	.all(errorCtrl.send405);


router.route('/:runID')
	.all(errorCtrl.send405);


router.route('/:runID/download')
	.all(errorCtrl.send405);


module.exports = router;
