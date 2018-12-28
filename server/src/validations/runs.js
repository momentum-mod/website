'use strict';
const Joi = require('joi'),
	validation = require('../models/validation');

module.exports = {

	urlParamID: {
		param: Joi.object().keys({
			runID: validation.run.id,
		}),
	},

	getAll: {
		query: Joi.object().keys({
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
			playerID: validation.user.id,
			playerIDs: validation.queryParam.playerIDs,
			flags: validation.run.flags,
			isPersonalBest: validation.run.isPersonalBest,
			mapID: validation.map.id,
		}),
	},

};
