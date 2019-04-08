'use strict';
const Joi = require('joi');

module.exports = {
	pointsHeight: Joi.number(),
	pointsZPos: Joi.number(),
	points: Joi.object().max(32).pattern(/p\d+/, Joi.string()),
};