'use strict';
const Joi = require('joi');

module.exports = {
	zoneNum: Joi.number().integer().min(0).max(64),
	zoneType: Joi.number().integer().min(0).max(4),
	zoneProps: Joi.object().keys({
		properties: Joi.object()
	}),
};