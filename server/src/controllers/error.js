'use strict';
const ServerError = require('../helpers/server-error');

module.exports = {

	send404: (req, res, next) => {
		next(new ServerError(404, 'Not Found'));
	},

	send405: (req, res, next) => {
		next(new ServerError(405, 'Method Not Allowed'));
	}

};
