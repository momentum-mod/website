'use strict';
const express = require('express'),
	router = express.Router(),
	errorCtrl = require('../../controllers/error'),
	adminCtrl = require('../../controllers/admin');

router.route('/users/:userID')
	.patch(adminCtrl.updateUser)
	.all(errorCtrl.send405);

router.route('/users/:userID/permissions/:permID')
	.post(adminCtrl.giveUserPermission)
	.delete(adminCtrl.removeUserPermission)
	.all(errorCtrl.send405);

module.exports = router;
