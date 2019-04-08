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
			type: validation.map.type,
			difficulty_low: validation.mapTrack.difficulty,
			difficulty_high: validation.mapTrack.difficulty,
			isLinear: validation.mapTrack.isLinear,
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
				description: validation.mapInfo.description.required(),
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
							zoneType: validation.mapZone.zoneType.required(),
							zoneProps: validation.mapZone.zoneProps,
							geometry: Joi.object().keys({
								pointsHeight: validation.mapZoneGeometry.pointsHeight.required(),
								pointsZPos: validation.mapZoneGeometry.pointsZPos.required(),
								points: validation.mapZoneGeometry.points.required(),
							}).unknown(false),
							stats: Joi.object().keys({
								baseStats: Joi.object(),
							}),
						}).unknown(false),
					),
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
		body: Joi.object().keys({
			statusFlag: validation.map.statusFlag,
		}).unknown(false),
	},

	updateInfo: {
		body: Joi.object().keys({
			description: validation.mapInfo.description,
			numTracks: validation.mapInfo.numTracks,
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
		}).unknown(false),
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
		}).unknown(false),
	},

};
