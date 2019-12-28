'use strict';
const { Segments, Joi } = require('celebrate'),
	validation = require('../models/validation');

module.exports = {

	getAll: {
		[Segments.QUERY]: Joi.object().keys({
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
			userID: validation.user.id,
			playerID: validation.user.steamID,
			playerIDs: validation.queryParam.playerIDs,
			flags: validation.run.flags,
			mapID: validation.map.id,
			track: validation.mapTrack.trackNum,
			zone: validation.mapZone.zoneNum,
			order: Joi.string().valid('date', 'rank'),
		}),
	},

};
