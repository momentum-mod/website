'use strict';
const Joi = require('joi');

module.exports = {
	type: Joi.number().integer().min(0).max(4),
	pointsHeight: Joi.number(),
	pointsZPos: Joi.number(),
	points: Joi.object().max(32).pattern(/p\d+/, Joi.string()),
	zoneProps: Joi.object().keys({
		properties: Joi.object(),
	}),
};
