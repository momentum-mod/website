'use strict';
const jwt = require('jsonwebtoken'),
	util = require('util'),
	config = require('../../config/config'),
	createJwt = util.promisify(jwt.sign),
	userMdl = require('./user');

module.exports = {

	genAccessToken: (usr) => {
		const payload = {
			id: usr.id,
			permissions: usr.permissions
		};
		const options = {
			issuer: config.domain,
			subject: String(usr.id),
			expiresIn: config.accessToken.expTime
		};
		return createJwt(payload, config.accessToken.secret, options);
	}

};
