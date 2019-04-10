'use strict';
const Joi = require('joi');

module.exports = {
	rankXP: Joi.object().keys({
		top10: Joi.object().keys({
			WRPoints: Joi.number(),
			rankPercentages: Joi.array().items(
				Joi.number(),
			),
		}).unknown(false),

		formula: Joi.object().keys({
			A: Joi.number(),
			B: Joi.number(),
		}).unknown(false),

		groups: Joi.object().keys({
			maxGroups: Joi.number(),
			groupScaleFactors: Joi.array().items(
				Joi.number(),
			),
			groupExponents: Joi.array().items(
				Joi.number(),
			),
			groupMinSizes: Joi.array().items(
				Joi.number(),
			),
			groupPointPcts: Joi.array().items(
				Joi.number(),
			),
		}).unknown(false),
	}).unknown(false),

	cosXP: Joi.object(),
};