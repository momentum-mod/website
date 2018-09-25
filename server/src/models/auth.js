'use strict';
const jwt = require('jsonwebtoken'),
	util = require('util'),
	config = require('../../config/config'),
	createJwt = util.promisify(jwt.sign),
	userMdl = require('./user');

module.exports = {

	// For what user is, look here: https://github.com/liamcurry/passport-steam/blob/master/lib/passport-steam/strategy.js#L25
	genAccessToken: (user) => {
		return new Promise((resolve, reject) => {
			userMdl.findOrCreate(null, user).then(usr => {
				const payload = {
					id: usr.id,
					displayName: usr.alias,
					avatar: usr.avatar_url,
					permissions: usr.permission
				};
				const options = {
					issuer: config.domain,
					subject: String(user.id),
					expiresIn: config.accessToken.expTime
				};
				resolve(createJwt(payload, config.accessToken.secret, options));
			}).catch(reject)
		});
	}
};
