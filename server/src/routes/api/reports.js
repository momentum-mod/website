'use strict';
const express = require('express'),
	router = express.Router(),
	{ celebrate } = require('celebrate'),
    reportsValidation = require('../../validations/reports'),
    reportCtrl = require('../../controllers/reports'),
	errorCtrl = require('../../controllers/error');

router.route('/')
	.post(celebrate(reportsValidation.create), reportCtrl.create)
	.all(errorCtrl.send405);

module.exports = router;
