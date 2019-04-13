'use strict';
const Joi = require('joi');

module.exports = {
	id: Joi.number().integer(),
	flags: Joi.number().integer(),
};
