'use strict';
const Joi = require('joi');

module.exports = {
	limit: Joi.number().integer().min(1).max(20),
	offset: Joi.number().integer().min(0).max(5000),
	search: Joi.string(),
	expand: Joi.string().regex(/[a-zA-Z,]*/),
	priority: Joi.boolean(),
	status: Joi.string().regex(/[0-9,]*/),
	playerIDs: Joi.string().regex(/[a-zA-Z0-9,]/), // can be improved! max length?
};
