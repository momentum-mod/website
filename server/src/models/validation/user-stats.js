'use strict';
const Joi = require('@hapi/joi');

module.exports = {
    cosXP: Joi.number().integer().min(0).max(Number.MAX_SAFE_INTEGER),
};
