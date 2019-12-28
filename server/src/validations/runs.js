'use strict';
const { Segments, Joi } = require('celebrate'),
	validation = require('../models/validation');

module.exports = {

	urlParamID: {
		[Segments.PARAMS]: Joi.object().keys({
			runID: validation.run.id,
		}),
	},

	urlParamSessionID: {
		[Segments.PARAMS]: Joi.object().keys({
			sesID: Joi.number().integer().positive(),
		})
	},

	getAll: {
		[Segments.QUERY]: Joi.object().keys({
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
			playerID: validation.user.id,
			playerIDs: validation.queryParam.playerIDs,
			flags: validation.run.flags,
			mapID: validation.map.id,
		}),
	},

	createSession: {
		[Segments.BODY]: Joi.object().keys({
			trackNum: validation.mapTrack.trackNum,
			zoneNum: validation.mapZone.zoneNum,
		}).unknown(false)
	},

	updateSession: {
		[Segments.BODY]: Joi.object().keys({
			zoneNum: validation.mapZone.zoneNum,
			tick: Joi.number().integer().positive(),
		}).unknown(false)
	}

};
