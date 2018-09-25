'use strict';

const genError = (statusCode, message) => {
	const err = new Error(message);
	err.status = statusCode;
	return err;
}

module.exports = {

	send404: (req, res, next) => {
		next(genError(404, 'Not Found'));
	},

	send405: (req, res, next) => {
		next(genError(405, 'Method Not Allowed'));
	}

};
