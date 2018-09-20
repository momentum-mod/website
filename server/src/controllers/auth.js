'use strict';
const express = require('express'),
    router = express.Router(),
	auth = require('../models/auth');

module.exports = {

	throughSteam: (req, res, next) => {
		// Redirected to the steam login page
		// Code here won't be executed
	},

	throughSteamReturn: (req, res, next) => {
		auth.genAccessToken(req.user)
		.then((accessToken) => {
			res.cookie('accessToken', accessToken);
			res.redirect('/');
		}).catch(next);
	}

}
