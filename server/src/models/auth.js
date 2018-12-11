'use strict';
const jwt = require('jsonwebtoken'),
	util = require('util'),
	config = require('../../config/config'),
	createJwt = util.promisify(jwt.sign),
	userMdl = require('./user');

module.exports = {

	genAccessToken: (usr, gameAuth) => {
		const payload = {
			id: usr.id,
			permissions: usr.permissions,
			gameAuth: gameAuth ? true : false,
		};
		const options = {
			issuer: config.domain,
			expiresIn: gameAuth ?
				config.accessToken.gameExpTime
				: config.accessToken.expTime,
		};
		return createJwt(payload, config.accessToken.secret, options);
	}

};
