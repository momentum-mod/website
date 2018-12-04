'use strict';
const express = require('express'),
	router = express.Router(),
	errorCtrl = require('../../controllers/error'),
	statsCtrl = require('../../controllers/stats');

router.route('/global')
	.get(statsCtrl.getGlobalBaseStats)
	.all(errorCtrl.send405);

router.route('/global/maps')
	.get(statsCtrl.getGlobalMapStats)
	.all(errorCtrl.send405);

module.exports = router;
