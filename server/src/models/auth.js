'use strict';
const jwt = require('jsonwebtoken'),
	util = require('util'),
	{ User, UserAuth } = require('../../config/sqlize'),
	config = require('../../config/config'),
	ServerError = require('../helpers/server-error'),
	createJWT = util.promisify(jwt.sign),
	verifyJWT = util.promisify(jwt.verify);

module.exports = {

	createRefreshToken: (user, gameAuth) => {
		return module.exports.genRefreshToken(user.id, gameAuth).then(refreshToken => {
			return UserAuth.update({ refreshToken: refreshToken }, {
				where: { userID: user.id },
			}).then(() => {
				return Promise.resolve(refreshToken);
			});
		});
	},

	refreshToken: (userID, refreshToken) => {
		return User.findById(userID, {
			include: [{
				model: UserAuth,
				as: 'auth',
				where: { refreshToken: refreshToken },
			}]
		}).then(user => {
			if (user)
				return module.exports.genAccessToken(user);
			return Promise.reject(new ServerError(401, 'Forbidden'));
		});
	},

	revokeToken: (userID) => {
		return UserAuth.update({ refreshToken: '' }, {
			where: { userID: userID },
		});
	},

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
		return createJWT(payload, config.accessToken.secret, options);
	},

	genRefreshToken: (userID) => {
		const payload = {
			id: userID,
		}
		const options = {
			issuer: config.domain,
		}
		return createJWT(payload, config.accessToken.secret, options);
	},

	verifyToken: (token) => {
		return verifyJWT(token, config.accessToken.secret).catch(err => {
			const clientErrors = ['TokenExpiredError','JsonWebTokenError','NotBeforeError'];
			if (clientErrors.includes(err.name)) {
				err.status = 401;
				err.message = 'Invalid token given';
			}
			return Promise.reject(err);
		});
	},

};
