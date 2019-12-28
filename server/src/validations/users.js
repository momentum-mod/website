'use strict';
const { Segments, Joi } = require('celebrate'),
	validation = require('../models/validation');

module.exports = {

	urlParamID: {
		[Segments.PARAMS]: Joi.object().keys({
			userID: validation.user.id,
		}),
	},

	get: {
		[Segments.QUERY]: Joi.object().keys({
			expand: validation.queryParam.expand,
		}),
	},

	getAll: {
		[Segments.QUERY]: Joi.object().keys({
			playerID: validation.user.steamID,
			playerIDs: validation.queryParam.playerIDs,
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
			search: validation.queryParam.search,
			expand: validation.queryParam.expand,
		}),
	},

	getActivities: {
		[Segments.QUERY]: Joi.object().keys({
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
			userID: validation.user.id,
			type: validation.activity.type,
			data: validation.activity.data,
			expand: validation.queryParam.expand,
		}),
	},

	getCredits: {
		[Segments.QUERY]: Joi.object().keys({
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
			map: validation.map.id,
			expand: validation.queryParam.expand,
		}),
	},

	getRuns: {
		[Segments.QUERY]: Joi.object().keys({
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
			expand: validation.queryParam.expand,
		}),
	},

};
