'use strict';
const Joi = require('joi');

module.exports = {
	description: Joi.string().max(1000),
	numBonuses: Joi.number().integer().min(0).max(255),
	numZones: Joi.number().integer().min(0).max(255),
	isLinear: Joi.boolean(),
	difficulty: Joi.number().integer().min(0),
	creationDate: Joi.date().iso(),
};
