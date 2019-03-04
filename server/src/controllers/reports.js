'use strict';
const report = require('../models/report');

module.exports = {

	create: (req, res, next) => {
		req.body.submitterID = req.user.id;
		report.create(req.body).then(report => {
            	res.json(report);
		}).catch(next);
	},

}
