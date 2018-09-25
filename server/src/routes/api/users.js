'use strict';
const express = require('express'),
	router = express.Router(),
	passport = require('passport'),
	errorCtrl = require('../../controllers/error'),
	userCtrl = require('../../controllers/users');

router.route('/')
	.get(errorCtrl.send405)
	.post(errorCtrl.send405)
	.put(errorCtrl.send405)
	.delete(errorCtrl.send405);

router.route('/:id')
	.get(userCtrl.find)
	.post(userCtrl.findOrCreate)
	.put(errorCtrl.send405)
	.delete(errorCtrl.send405);

module.exports = router;
