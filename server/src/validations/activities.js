'use strict';
const Joi = require('joi'),
	validation = require('../models/validation');

module.exports = {

	getAll: {
		query: Joi.object().keys({
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
			userID: validation.user.id,
			type: validation.activity.type,
			data: validation.activity.data,
		}),
	},

};
