'use strict';
const Joi = require('@hapi/joi');

module.exports = {
	id: Joi.number().integer(),
	read: Joi.boolean(),
};
