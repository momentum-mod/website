'use strict';
const Joi = require('joi');

module.exports = {
	id: Joi.string().regex(/^[0-9]{1,17}$/),
	alias: Joi.string().min(1).max(32),
	permissions: Joi.number().integer().min(0),
};
