'use strict';
const express = require('express'),
	router = express.Router(),
	passport = require('passport');

router.use('/auth', require('./auth'));
router.use('/users', require('./users'));

module.exports = router;
