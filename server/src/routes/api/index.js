'use strict';
const express = require('express'),
	router = express.Router(),
	authMiddleware = require('../../middlewares/auth');

router.use('/maps', require('./maps'));
router.use('/users', require('./users'));
router.use('/user', require('./user'));
router.use('/activities', require('./activities'));
router.use('/runs', require('./runs'));
router.use('/stats', require('./stats'));
router.use('/admin', [authMiddleware.denyGameLogin, authMiddleware.requirePower], require('./admin'));
router.use('*', require('./404'));

module.exports = router;
