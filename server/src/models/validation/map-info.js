'use strict';
const Joi = require('joi');

module.exports = {
	description: Joi.string().max(1000),
	youtubeID: Joi.string().max(11),
	numTracks: Joi.number().integer().min(1).max(64),
	creationDate: Joi.date().iso(),
};
