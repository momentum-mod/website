'use strict';

module.exports = {

	send405: (req, res, next) => {
		const err = new Error('Method Not Allowed');
		err.status = 405;
		next(err);
	}

};
