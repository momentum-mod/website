'use strict';
const { Segments, Joi } = require('celebrate'),
	validation = require('../models/validation');

module.exports = {

	mapsURLParamsValidation: {
		[Segments.PARAMS]: Joi.object().keys({
			mapID: validation.map.id,
			mapCredID: validation.mapCredit.id,
			imgID: validation.mapImage.id,
			runID: validation.run.id,
			sesID: Joi.number().integer().positive(),
		}),
	},

	getAll: {
		[Segments.QUERY]: Joi.object().keys({
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
			search: validation.queryParam.search,
			submitterID: validation.user.id,
			expand: validation.queryParam.expand,
			type: validation.map.type,
			difficulty_low: validation.mapTrack.difficulty,
			difficulty_high: validation.mapTrack.difficulty,
			isLinear: validation.mapTrack.isLinear,
		}),
	},

	get: {
		[Segments.QUERY]: Joi.object().keys({
			expand: validation.queryParam.expand,
		}),
	},

	create: {
		[Segments.BODY]: Joi.object().keys({
			name: validation.map.name.required(),
			type: validation.map.type.required(),
			info: Joi.object().keys({
				description: validation.mapInfo.description.required(),
				youtubeID: validation.mapInfo.youtubeID,
				numTracks: validation.mapInfo.numTracks.required(),
				creationDate: validation.mapInfo.creationDate,
			}).unknown(false),
			tracks: Joi.array().items(
				Joi.object().keys({
					trackNum: validation.mapTrack.trackNum.required(),
					isLinear: validation.mapTrack.isLinear.required(),
					numZones: validation.mapTrack.numZones.required(),
					difficulty: validation.mapTrack.difficulty.required(),
					zones: Joi.array().items(
						Joi.object().keys({
							zoneNum: validation.mapZone.zoneNum.required(),
							triggers: Joi.array().items(
								Joi.object().keys({
									type: validation.mapZoneTrigger.type.required(),
									pointsHeight: validation.mapZoneTrigger.pointsHeight.required(),
									pointsZPos: validation.mapZoneTrigger.pointsZPos.required(),
									points: validation.mapZoneTrigger.points.required(),
									zoneProps: validation.mapZoneTrigger.zoneProps,
								}).unknown(false),
							).min(1),
							stats: Joi.object().keys({
								baseStats: Joi.object(),
							}),
						}).unknown(false),
					).min(2),
					stats: Joi.object().keys({
						baseStats: Joi.object(),
					}),
				}).unknown(false),
			),
			stats: Joi.object().keys({
				baseStats: Joi.object(),
			}),
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
		[Segments.BODY]: Joi.object().keys({
			statusFlag: validation.map.statusFlag,
			name: validation.map.name,
		}).unknown(false),
	},

	updateInfo: {
		[Segments.BODY]: Joi.object().keys({
			description: validation.mapInfo.description,
			youtubeID: validation.mapInfo.youtubeID,
			numTracks: validation.mapInfo.numTracks,
			creationDate: validation.mapInfo.creationDate,
		}).unknown(false),
	},

	getCredits: {
		[Segments.QUERY]: Joi.object().keys({
			expand: validation.queryParam.expand,
		}),
	},

	createCredit: {
		[Segments.BODY]: Joi.object().keys({
			mapID: validation.map.id,
			type: validation.mapCredit.type,
			userID: validation.user.id,
		}).unknown(false),
	},

	getCredit: {
		[Segments.QUERY]: Joi.object().keys({
			expand: validation.queryParam.expand,
		}),
	},

	updateCredit: {
		[Segments.BODY]: Joi.object().keys({
			type: validation.mapCredit.type,
			userID: validation.user.id,
		}).unknown(false),
	},

};
