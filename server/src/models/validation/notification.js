'use strict';
const Joi = require('joi');

module.exports = {
	id: Joi.number().integer(),
	read: Joi.boolean(),
};
