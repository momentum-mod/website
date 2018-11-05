'use strict';
const auth = require('../models/auth'),
	axios = require('axios'),
	config = require('../../config/config'),
	user = require('../models/user');

module.exports = {

	throughSteam: (req, res, next) => {
		// Redirected to the steam login page
		// Code here won't be executed
	},

	throughSteamReturn: (req, res, next) => {
		auth.genAccessToken(req.user)
		.then((accessToken) => {
			res.cookie('accessToken', accessToken);
			res.redirect('/dashboard');
		}).catch(next);
	},

	verifyUserTicket: (req, res, next) => {
		const userTicket = Buffer.from(req.body, 'utf8').toString('hex');
		const idToVerify = req.get('id');
		console.log("Id: ", idToVerify);

		if (userTicket && idToVerify) {
			axios.get('https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/', {
				params: {
					key: config.steam.webAPIKey,
					appid: 669270,
					ticket: userTicket
				}
			}).then((sres) => {
				if (sres.data.response.error)
					next(sres); // TODO parse the error
				else if (sres.data.response.params.result === 'OK') {
					if (idToVerify === sres.data.response.params.steamid) {
						console.log("They match!");
						// TODO:
						// Generate some sort of key? to send back for the game auth
						// Return that key back to them
						user.findOrCreateFromGame(idToVerify).then((resp) => {
							res.send(resp);
						}).catch(next);
					}
					else
						res.sendStatus(401); // Generate an error here
				}
				else
					res.send(sres.data);
			}).catch(next);
		}
		else
			res.sendStatus(400); // Bad request
	}
};
