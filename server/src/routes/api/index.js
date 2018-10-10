'use strict';
const express = require('express'),
	router = express.Router(),
	authMiddleware = require('../../middlewares/auth'),
	user = require('../../models/user');

router.use('/auth', require('./auth'));
router.use('/maps', require('./maps'));
router.use('/users', require('./users'));
router.use('/admin', [
	authMiddleware.requireLogin,
	authMiddleware.requireAdmin
], require('./admin'));
router.use('/activities', require('./activities'));
router.use('*', require('./404'));

module.exports = router;
