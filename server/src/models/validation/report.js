'use strict';
const Joi = require('@hapi/joi');

module.exports = {
    id: Joi.number().integer(),
    data: Joi.string().regex(/[0-9]/),
    type: Joi.number().integer().min(0).max(255),
    category: Joi.number().integer().min(0).max(3),
    message: Joi.string(),
    resolved: Joi.boolean(),
    resolutionMessage: Joi.string(),
};
