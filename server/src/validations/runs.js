'use strict';
const Joi = require('joi'),
	validation = require('../models/validation');

module.exports = {

	urlParamID: {
		param: Joi.object().keys({
			runID: validation.run.id,
		}),
	},

	urlParamSessionID: {
		param: Joi.object().keys({
			sesID: Joi.number().integer().positive(),
		})
	},

	getAll: {
		query: Joi.object().keys({
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
			playerID: validation.user.id,
			playerIDs: validation.queryParam.playerIDs,
			flags: validation.run.flags,
			mapID: validation.map.id,
		}),
	},

	createSession: {
		body: Joi.object().keys({
			trackNum: validation.mapTrack.trackNum,
			zoneNum: validation.mapZone.zoneNum,
		}).unknown(false)
	},

	updateSession: {
		body: Joi.object().keys({
			zoneNum: validation.mapZone.zoneNum,
			tick: Joi.number().integer().positive(),
		}).unknown(false)
	}

};
