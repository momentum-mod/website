'use strict';
const Joi = require('joi'),
	validation = require('../models/validation');

module.exports = {

	updateUser: {
		body: Joi.object().keys({
			alias: validation.user.alias,
			permissions: validation.user.permissions,
			profile: Joi.object().keys({
				bio: validation.profile.bio,
			}).unknown(false),
		}).unknown(false),
	},

	getMaps: {
		query: Joi.object().keys({
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
			search: validation.queryParam.search,
			submitterID: validation.user.id,
			expand: validation.queryParam.expand,
			priority: validation.queryParam.priority,
			status: validation.queryParam.status,
		}),
	},

	updateMap: {
		body: Joi.object().keys({
			statusFlag: validation.map.statusFlag,
		}).unknown(false),
	},

};
