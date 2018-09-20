'use strict';
const express = require('express'),
	router = express.Router(),
	passport = require('passport'),
	errorCtrl = require('../../controllers/error');//,
	//userCtrl = require('../../controllers/auth');

router.route('/')
	.get(errorCtrl.send405)
	.post(errorCtrl.send405)
	.put(errorCtrl.send405)
	.delete(errorCtrl.send405);

router.route('/:id')
	.get(errorCtrl.send405)
	.post(errorCtrl.send405)
	.put(errorCtrl.send405)
	.delete(errorCtrl.send405);

module.exports = router;
