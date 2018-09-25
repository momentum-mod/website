'use strict';
const express = require('express'),
	router = express.Router(),
	errorCtrl = require('../../controllers/error');

router.route('*')
	.all(errorCtrl.send404);

module.exports = router;
