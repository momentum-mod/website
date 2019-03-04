'use strict';
const express = require('express'),
	router = express.Router(),
	validate = require('express-validation'),
    reportsValidation = require('../../validations/reports'),
    reportCtrl = require('../../controllers/reports'),
	errorCtrl = require('../../controllers/error');

router.route('/')
	.post(validate(reportsValidation.create), reportCtrl.create)
	.all(errorCtrl.send405);

module.exports = router;
