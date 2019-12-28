'use strict';
const Joi = require('@hapi/joi');

module.exports = {
	bio: Joi.string().max(1000).allow(''),
};
