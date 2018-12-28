'use strict';
const Joi = require('joi');

module.exports = {
	notifyOn: Joi.number().integer().min(0).max(255),
};
