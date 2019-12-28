'use strict';
const Joi = require('@hapi/joi');

module.exports = {
	id: Joi.number().integer(),
	flags: Joi.number().integer(),
};
