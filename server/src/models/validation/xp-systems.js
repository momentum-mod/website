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

	cosXP: Joi.object().keys({
		levels: Joi.object().keys({
			maxLevels: Joi.number(),
			startingValue: Joi.number(),
			linearScaleBaseIncrease: Joi.number(),
			linearScaleInterval:Joi.number(),
			linearScaleIntervalMultiplier: Joi.number(),
			staticScaleStart: Joi.number(),
			staticScaleBaseMultiplier: Joi.number(),
			staticScaleInterval:Joi.number(),
			staticScaleIntervalMultiplier: Joi.number(),
		}).unknown(false),

		completions: Joi.object().keys({
			unique: Joi.object().keys({
				tierScale: Joi.object().keys({
					linear: Joi.number(),
					staged: Joi.number(),
					// bonus is static, as (tierScale.linear * (initialScale(tier3)) + tierScale.linear * (initialScale(tier4))) / 2
				}).unknown(false),
			}).unknown(false),
			repeat: Joi.object().keys({
				tierScale: Joi.object().keys({
					linear: Joi.number(),
					staged: Joi.number(),
					stages: Joi.number(),
					bonus: Joi.number(), // = staged
				}).unknown(false),
			})
		}).unknown(false),
	}),
};