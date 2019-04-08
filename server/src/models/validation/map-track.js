'use strict';
const Joi = require('joi');

module.exports = {
	trackNum: Joi.number().integer().min(0).max(64),
	numZones: Joi.number().integer().min(1).max(64),
	isLinear: Joi.boolean(),
	difficulty: Joi.number().integer().min(1).max(12),
};