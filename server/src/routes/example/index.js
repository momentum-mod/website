'use strict';
const express = require('express'),
	router = express.Router(),
	homeCtrl = require('../../controllers/example'),
	errorCtrl = require('../../controllers/error');

router.route('/')
	.get(homeCtrl.example)
	.post(errorCtrl.send405)
	.put(errorCtrl.send405)
	.delete(errorCtrl.send405);

module.exports = router;
