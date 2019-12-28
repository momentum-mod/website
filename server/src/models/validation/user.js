'use strict';
const Joi = require('@hapi/joi');

module.exports = {
	id: Joi.number().integer().positive(),
	steamID: Joi.string().regex(/^[0-9]{1,20}$/),
	alias: Joi.string().min(1).max(64).allow(''),
	roles: Joi.number().integer().min(0),
	bans: Joi.number().integer().min(0),
};
