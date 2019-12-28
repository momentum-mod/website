'use strict';
const Joi = require('@hapi/joi');

module.exports = {
	id: Joi.number().integer(),
	name: Joi.string().regex(/[a-zA-Z0-9_]+/),
	type: Joi.number().integer(),
	statusFlag: Joi.number().integer().min(0).max(127),
};
