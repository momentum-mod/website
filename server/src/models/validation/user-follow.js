'use strict';
const Joi = require('@hapi/joi');

module.exports = {
	notifyOn: Joi.number().integer().min(0).max(255),
};
