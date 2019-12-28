'use strict';
const Joi = require('@hapi/joi');

module.exports = {
    refreshToken: Joi.string().regex(/([a-zA-Z0-9-_=-_=]+\.){2}[a-zA-Z0-9-_=]+/),
    accessTokenHeader: Joi.string().regex(/Bearer ([a-zA-Z0-9-_=]+\.){2}[a-zA-Z0-9-_=]+/),
};
