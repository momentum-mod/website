'use strict';
const Joi = require('joi'),
	validation = require('../models/validation');

module.exports = {

	urlParamID: {
		params: Joi.object().keys({
			userID: validation.user.id,
		}),
	},

	get: {
		query: Joi.object().keys({
			expand: validation.queryParam.expand,
		}),
	},

	getAll: {
		query: Joi.object().keys({
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
			search: validation.queryParam.search,
			expand: validation.queryParam.expand,
		}),
	},

	getActivities: {
		query: Joi.object().keys({
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
			userID: validation.user.id,
			type: validation.activity.type,
			data: validation.activity.data,
			expand: validation.queryParam.expand,
		}),
	},

	getCredits: {
		query: Joi.object().keys({
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
			map: validation.map.id,
			expand: validation.queryParam.expand,
		}),
	},

	getRuns: {
		query: Joi.object().keys({
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
			expand: validation.queryParam.expand,
		}),
	},

};
