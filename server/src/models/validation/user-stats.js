'use strict';
const Joi = require('joi');

module.exports = {
    cosXP: Joi.number().integer().min(0).max(Number.MAX_SAFE_INTEGER),
};