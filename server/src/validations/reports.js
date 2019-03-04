'use strict';
const Joi = require('joi'),
	validation = require('../models/validation');

module.exports = {

	urlParamID: {
		param: Joi.object().keys({
			runID: validation.report.id,
		}),
	},

	create: {
		body: Joi.object().keys({
            data: validation.report.data.required(),
            type: validation.report.type.required(),
            category: validation.report.category.required(),
			message: validation.report.message.required(),
		}),
	},

};
