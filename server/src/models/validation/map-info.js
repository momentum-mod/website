'use strict';
const Joi = require('@hapi/joi');

module.exports = {
	description: Joi.string().max(1000),
	youtubeID: Joi.string().max(11).empty(null),
	numTracks: Joi.number().integer().min(1).max(64),
	creationDate: Joi.date().iso(),
};
