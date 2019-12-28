'use strict';
const { Segments, Joi } = require('celebrate'),
	validation = require('../models/validation');

module.exports = {

	refreshToken: {
		[Segments.BODY]: Joi.object().keys({
			refreshToken: validation.auth.refreshToken,
		}),
	},

	revokeToken: {
		[Segments.HEADERS]: Joi.object().keys({
			authorization: validation.auth.accessTokenHeader.required(),
		}).unknown(),
	},

};
