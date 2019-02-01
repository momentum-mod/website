'use strict';
const Joi = require('joi'),
	validation = require('../models/validation');

module.exports = {

	refreshToken: {
		body: Joi.object().keys({
			refreshToken: validation.auth.refreshToken,
		}),
	},

	revokeToken: {
		headers: Joi.object().keys({
			authorization: validation.auth.accessTokenHeader.required(),
		}),
	},

};
