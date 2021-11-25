'use strict';
const express = require('express'),
	router = express.Router(),
	{ celebrate } = require('celebrate'),
	adminValidation = require('../../validations/admin'),
	usersValidation = require('../../validations/users'),
	reportsValidation = require('../../validations/reports'),
	mapsValidation = require('../../validations/maps'),
	errorCtrl = require('../../controllers/error'),
	adminCtrl = require('../../controllers/admin'),
	authMiddleware = require("../../middlewares/auth");

router.route('/users')
	.post([authMiddleware.requireAdmin, celebrate(adminValidation.createUser)], adminCtrl.createUser)
	.all(errorCtrl.send405);

router.route('/users/merge')
	.post([authMiddleware.requireAdmin, celebrate(adminValidation.mergeUsers)], adminCtrl.mergeUsers)
	.all(errorCtrl.send405);

router.route('/users/:userID')
	.patch(celebrate(adminValidation.updateUser), adminCtrl.updateUser)
	.delete(authMiddleware.requireAdmin, adminCtrl.deleteUser)
	.all(errorCtrl.send405);

router.route('/user-stats')
	.patch([authMiddleware.requireAdmin, celebrate(adminValidation.updateAllUserStats)], adminCtrl.updateAllUserStats)
	.all(errorCtrl.send405);

router.route('/maps')
	.get(celebrate(adminValidation.getMaps), adminCtrl.getMaps)
	.all(errorCtrl.send405);

router.route('/maps/:mapID')
	.patch(celebrate(adminValidation.updateMap), adminCtrl.updateMap)
	.delete(authMiddleware.requireAdmin, adminCtrl.deleteMap)
	.all(errorCtrl.send405);

router.route('/reports')
	.get(celebrate(adminValidation.getReports), adminCtrl.getReports)
	.all(errorCtrl.send405);

router.route('/reports/:reportID')
	.patch(celebrate(adminValidation.updateReport), adminCtrl.updateReport)
	.all(errorCtrl.send405);

router.route('/xpsys')
	.get(adminCtrl.getXPSystems)
	.put([authMiddleware.requireAdmin, celebrate(adminValidation.updateXPSystems)], adminCtrl.updateXPSystems)
	.all(errorCtrl.send405);

router.param('userID', celebrate(usersValidation.urlParamID));
router.param('mapID', celebrate(mapsValidation.mapsURLParamsValidation));
router.param('reportID', celebrate(reportsValidation.urlParamID));

module.exports = router;
