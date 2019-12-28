'use strict';
const { Segments, Joi } = require('celebrate'),
	validation = require('../models/validation');

module.exports = {

	urlParamID: {
		[Segments.PARAMS]: Joi.object().keys({
			reportID: validation.report.id,
		}),
	},

	create: {
		[Segments.BODY]: Joi.object().keys({
            data: validation.report.data.required(),
            type: validation.report.type.required(),
            category: validation.report.category.required(),
			message: validation.report.message.required(),
		}),
	},

};
