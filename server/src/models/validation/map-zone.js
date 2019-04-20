'use strict';
const Joi = require('joi');

module.exports = {
	zoneNum: Joi.number().integer().min(0).max(64),
};
