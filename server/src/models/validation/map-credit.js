'use strict';
const Joi = require('joi');

module.exports = {
	id: Joi.number().integer(),
	type: Joi.number().integer(),
};
