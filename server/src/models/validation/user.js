'use strict';
const Joi = require('joi');

module.exports = {
	id: Joi.number().integer().positive(),
	steamID: Joi.string().regex(/^[0-9]{1,20}$/),
	alias: Joi.string().min(1).max(32),
	roles: Joi.number().integer().min(0),
	bans: Joi.number().integer().min(0),
};
