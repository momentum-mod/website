'use strict';
const Joi = require('@hapi/joi');

module.exports = {
	zoneNum: Joi.number().integer().min(0).max(64),
};
