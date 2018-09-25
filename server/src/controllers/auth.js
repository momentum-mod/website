'use strict';
const express = require('express'),
    router = express.Router(),
	auth = require('../models/auth'),
	axios = require('axios'),
	config = require('../../config/config');

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
	},

	verifyUserTicket: (req, res, next) => {
		var userTicket = req.body.ticket;

		if (userTicket) {
			axios.get('https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/', {
				params: {
					key: config.steam.webAPIKey,
					appid: 669270,
					ticket: userTicket
				}
			}).then((sres) => {
				console.log(sres.status);
				console.log(sres.body);
				// TODO verify the steamID here
				sres.sendStatus(200);
			}).catch(next);
		}
		else
			res.sendStatus(400); // Bad request
	}
};
