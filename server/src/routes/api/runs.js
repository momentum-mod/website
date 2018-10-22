'use strict';
const express = require('express'),
	router = express.Router(),
	authMiddleware = require('../../middlewares/auth'),
	errorCtrl = require('../../controllers/error'),
	runsCtrl = require('../../controllers/runs');

router.route('/')
	.post([authMiddleware.requireLogin], runsCtrl.create)
	.all(errorCtrl.send405);

router.route('/:runID')
	.get(runsCtrl.get)
	.all(errorCtrl.send405);

module.exports = router;
