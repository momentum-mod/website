'use strict';
const express = require('express'),
	router = express.Router(),
	validate = require('express-validation'),
	adminValidation = require('../../validations/admin'),
	usersValidation = require('../../validations/users'),
	reportsValidation = require('../../validations/reports'),
	mapsValidation = require('../../validations/maps'),
	errorCtrl = require('../../controllers/error'),
	adminCtrl = require('../../controllers/admin');

router.route('/users/:userID')
	.patch(validate(adminValidation.updateUser), adminCtrl.updateUser)
	.all(errorCtrl.send405);

router.route('/maps')
	.get(validate(adminValidation.getMaps), adminCtrl.getMaps)
	.all(errorCtrl.send405);

router.route('/maps/:mapID')
	.patch(validate(adminValidation.updateMap), adminCtrl.updateMap)
	.all(errorCtrl.send405);

router.route('/reports')
	.get(validate(adminValidation.getReports), adminCtrl.getReports)
	.all(errorCtrl.send405);

router.route('/reports/:reportID')
	.patch(validate(adminValidation.updateReport), adminCtrl.updateReport)
	.all(errorCtrl.send405);

router.param('userID', validate(usersValidation.urlParamID));
router.param('mapID', validate(mapsValidation.urlParamID));
router.param('reportID', validate(reportsValidation.urlParamID));

module.exports = router;
