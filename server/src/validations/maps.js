'use strict';
const Joi = require('joi'),
	validation = require('../models/validation');

module.exports = {

	urlParamID: {
		params: Joi.object().keys({
			mapID: validation.map.id,
		}),
	},

	urlParamCredID: {
		params: Joi.object().keys({
			mapCredID: validation.mapCredit.id,
		}),
	},

	urlParamImgID: {
		params: Joi.object().keys({
			imgID: validation.mapImage.id,
		}),
	},

	getAll: {
		query: Joi.object().keys({
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
			search: validation.queryParam.search,
			submitterID: validation.user.id,
			expand: validation.queryParam.expand,
		}),
	},

	get: {
		query: Joi.object().keys({
			expand: validation.queryParam.expand,
		}),
	},

	create: {
		body: Joi.object().keys({
			name: validation.map.name.required(),
			type: validation.map.type.required(),
			info: Joi.object().keys({
				name: validation.map.name, // extra data to remove
				type: validation.map.type, // extra data to remove
				description: validation.mapInfo.description.required(),
				numBonuses: validation.mapInfo.numBonuses.required(),
				numZones: validation.mapInfo.numZones.required(),
				isLinear: validation.mapInfo.isLinear.required(),
				difficulty: validation.mapInfo.difficulty.required(),
				creationDate: validation.mapInfo.creationDate,
			}).unknown(false),
			credits: Joi.array().items(
				Joi.object().keys({
					userID: validation.user.id,
					type: validation.mapCredit.type,
					user: Joi.any(), // extra data to remove
				}).unknown(false),
			),
		}).unknown(false),
	},

	update: {
		body: Joi.object().keys({
			statusFlag: validation.map.statusFlag,
		}).unknown(false),
	},

	updateInfo: {
		body: Joi.object().keys({
			description: validation.mapInfo.description,
			numBonuses: validation.mapInfo.numBonuses,
			numZones: validation.mapInfo.numZones,
			isLinear: validation.mapInfo.isLinear,
			difficulty: validation.mapInfo.difficulty,
			creationDate: validation.mapInfo.creationDate,
		}).unknown(false),
	},

	getCredits: {
		query: Joi.object().keys({
			expand: validation.queryParam.expand,
		}),
	},

	createCredit: {
		body: Joi.object().keys({
			mapID: validation.map.id,
			type: validation.mapCredit.type,
			userID: validation.user.id,
		}),
	},

	getCredit: {
		query: Joi.object().keys({
			expand: validation.queryParam.expand,
		}),
	},

	updateCredit: {
		body: Joi.object().keys({
			type: validation.mapCredit.type,
			userID: validation.user.id,
		}),
	},

};
