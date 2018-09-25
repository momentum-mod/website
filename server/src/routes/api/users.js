'use strict';
const express = require('express'),
	router = express.Router(),
	authMiddleware = require('../../middlewares/auth'),
	errorCtrl = require('../../controllers/error'),
	userCtrl = require('../../controllers/users');

router.route('/')
	.get(userCtrl.find)
	.all(errorCtrl.send405);

router.route('/:userID')
	.get(userCtrl.findOrCreate) //TODO: make it just find
	.patch([authMiddleware.requireLogin], userCtrl.update)
	.all(errorCtrl.send405);

module.exports = router;
