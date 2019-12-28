'use strict';
const Joi = require('@hapi/joi');

module.exports = {
	id: Joi.number().integer(),
	type: Joi.number().integer().min(0).max(127),
	data: Joi.number().integer(),
};
