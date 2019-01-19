'use strict';
const Joi = require('joi');

module.exports = {
	limit: Joi.number().integer().min(0).max(20),
	offset: Joi.number().integer().min(0).max(5000),
	search: Joi.string(), // hmmm
	expand: Joi.string().regex(/[a-zA-Z,]*/),
	priority: Joi.boolean(),
	status: Joi.string().regex(/[0-9,]*/), // should probably be moved out to somewhere else? change to statusIn?
	playerIDs: Joi.string().regex(/[0-9,]*/),
};
