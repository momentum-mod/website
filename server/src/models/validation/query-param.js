'use strict';
const Joi = require('@hapi/joi');

module.exports = {
	limit: Joi.number().integer().min(1).max(20),
	offset: Joi.number().integer().min(0).max(5000),
	search: Joi.string().allow(''), // Is there anywhere that this is used that shouldn't allow empty strings?
	expand: Joi.string().regex(/[a-zA-Z,]*/),
	priority: Joi.boolean(),
	status: Joi.string().regex(/[0-9,]*/), // should probably be moved out to somewhere else? change to statusIn?
	playerIDs: Joi.string().regex(/[0-9,]*/),
	order: Joi.string().valid("date", "time").required(), // Should this be moved somewhere else? Should it accept more than just date and time?
};
