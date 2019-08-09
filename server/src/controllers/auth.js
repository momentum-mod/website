'use strict';
const auth = require('../models/auth'),
	axios = require('axios'),
	config = require('../../config/config'),
	user = require('../models/user');

const postAuthData = (res) => {
	res.send('<script>window.close();</script>');
};

module.exports = {

	throughSteamReturn: (req, res, next) => {
		let accessToken = null;
		auth.genAccessToken(req.user).then(token => {
			accessToken = token;
			return auth.createRefreshToken(req.user, false);
		}).then(refreshToken => {
			res.cookie('accessToken', accessToken);
			res.cookie('refreshToken', refreshToken);
			res.cookie('user', JSON.stringify(req.user));
			const referrer = req.session.referrer;
			if (referrer) {
				delete req.session.referrer;
				res.redirect(referrer);
			} else {
				res.redirect('/dashboard');
			}
		}).catch(next);
	},

	twitterReturn: (req, res, next) => {
		if (req.account && req.account.user) {
			user.getProfile(req.account.user.id).then(profile => {
				if (profile) {
					user.createSocialLink(profile, 'twitter', {
						twitterID: req.account.id,
						displayName: req.account.username,
						oauthKey: req.account.token,
						oauthSecret: req.account.secret,
					})
				}
			}).catch(next);
		}
		postAuthData(res);
	},

	twitchReturn: (req, res, next) => {
		if (req.userID && req.account) {
			user.getProfile(req.userID).then(profile => {
				if (profile) {
					user.createSocialLink(profile, 'twitch', {
						twitchID: req.account.id,
						displayName: req.account.username,
						token: req.account.refresh,
					})
				}
			}).catch(next);
		}
		postAuthData(res);
	},

	discordReturn: (req, res, next) => {
		if (req.userID && req.account) {
			user.getProfile(req.userID).then(profile => {
				if (profile) {
					user.createSocialLink(profile, 'discord', {
						discordID: req.account.id,
						displayName: req.account.username,
						accessToken: req.account.token,
						refreshToken: req.account.refresh,
					})
				}
			}).catch(next);
		}
		postAuthData(res);
	},

	verifyUserTicket: (req, res, next) => {
		const userTicket = Buffer.from(req.body, 'utf8').toString('hex');
		const idToVerify = req.get('id');

		if (userTicket && idToVerify) {
			axios.get(`https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/`, {
				params: {
					key: config.steam.webAPIKey,
					appid: 669270,
					ticket: userTicket
				}
			}).then((sres) => {
				if (sres.data.response.params.result === 'OK') {
					if (idToVerify === sres.data.response.params.steamid) {
						user.findOrCreateFromGame(idToVerify).then((usr) => {
							auth.genAccessToken(usr, true).then(token => {
								res.json({
									token: token,
									length: token.length,
								});
							}).catch(next);
						}).catch(next);
					}
					else
						res.sendStatus(401); // Generate an error here
				}
				else
					res.send(sres.data); // TODO parse the error?
			}).catch(next);
		}
		else
			res.sendStatus(400); // Bad request
	},

	refreshToken: (req, res, next) => {
		auth.verifyToken(req.body.refreshToken).then(tokenPayload => {
			return auth.refreshToken(tokenPayload.id, req.body.refreshToken);
		}).then(newAccessToken => {
			res.json({ accessToken: newAccessToken });
		}).catch(next);
	},

	revokeToken: (req, res, next) => {
		const authHeader = req.get('Authorization');
		const accessToken = authHeader.replace('Bearer ', '');
		auth.verifyToken(accessToken).then(tokenPayload => {
			return auth.revokeToken(tokenPayload.id);
		}).then(() => {
			res.sendStatus(204);
		}).catch(next);
	},

};
