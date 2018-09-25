'use strict';
const jwt = require('jsonwebtoken'),
	util = require('util'),
	config = require('../../config/config'),
	createJwt = util.promisify(jwt.sign),
	userMdl = require('./user');

module.exports = {

	// For what user is, look here: https://github.com/liamcurry/passport-steam/blob/master/lib/passport-steam/strategy.js#L25
	genAccessToken: (user) => {

		userMdl.findOrCreate(null, user);

		const payload = {
			id: user.id,
			displayName: user.displayName,
			avatar: user.photos[0].value,
			permissions: user.permissions
		}
		const options = {
			issuer: config.domain,
			subject: String(user.id),
			expiresIn: config.accessToken.expTime
		}
		return createJwt(payload, config.accessToken.secret, options);
	}

}
