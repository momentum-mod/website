'use strict';
const Joi = require('joi');

module.exports = {
	bio: Joi.string().max(1000),
};
