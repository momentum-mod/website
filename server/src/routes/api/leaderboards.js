'use strict';
const express = require('express'),
	router = express.Router(),
	authMiddleware = require('../../middlewares/auth'),
	errorCtrl = require('../../controllers/error'),
	leaderboardCtrl = require('../../controllers/leaderboards');

router.route('/:lbID/runs')
	.get(leaderboardCtrl.getAllRuns)
	.post([authMiddleware.requireLogin], leaderboardCtrl.createRun)
	.all(errorCtrl.send405);

router.route('/:lbID/runs/:runID')
	.get(leaderboardCtrl.getRun)
	.all(errorCtrl.send405);

router.route('/:lbID/runs/:runID/download')
	.get(leaderboardCtrl.downloadRunFile)
	.all(errorCtrl.send405);

module.exports = router;
