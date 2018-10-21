'use strict';
const express = require('express'),
	router = express.Router(),
	errorCtrl = require('../../controllers/error'),
	adminCtrl = require('../../controllers/admin');

router.route('/users/:userID')
	.patch(adminCtrl.updateUser)
	.all(errorCtrl.send405);

router.route('/maps')
	.get(adminCtrl.getMapQueue)
	.all(errorCtrl.send405);

router.route('/maps/:mapID')
	.patch(adminCtrl.updateMap)
	.all(errorCtrl.send405);

module.exports = router;
