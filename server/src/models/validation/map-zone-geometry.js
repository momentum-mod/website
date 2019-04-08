'use strict';
const Joi = require('joi');

module.exports = {
	pointsHeight: Joi.number(),
	pointsZPos: Joi.number(),
	points: Joi.object().keys({
		type: Joi.string().valid('Polygon'),
		coordinates: Joi.array().items(
			Joi.array().items(
				Joi.array().items(
					Joi.number()
				).length(2),
			),
		),
	}),
};