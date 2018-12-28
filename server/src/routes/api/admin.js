'use strict';
const express = require('express'),
	router = express.Router(),
	validate = require('express-validation'),
	adminValidation = require('../../validations/admin'),
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

router.param('mapID', validate(mapsValidation.urlParamID));

module.exports = router;
