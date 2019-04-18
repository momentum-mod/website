'use strict';
const runSession = require('../models/run-session'),
	ServerError = require('../helpers/server-error');

module.exports = {

	createSession: (req, res, next) => {
		runSession.createSession(req.user, req.params.mapID, req.body).then(ses => {
			res.json(ses);
		}).catch(next);
	},

	updateSession: (req, res, next) => {
		runSession.updateSession(req.params.sesID, req.user, req.body).then(timestamp => {
			res.json(timestamp);
		}).catch(next);
	},

	invalidateSession: (req, res, next) => {
		runSession.deleteSession(req.user).then(() => {
			res.sendStatus(204);
		}).catch(next);
	},

	completeSession: (req, res, next) => {
		if (req.body && Buffer.isBuffer(req.body)) {
			runSession.completeSession(req).then(runRes => {
				res.json(runRes);
			}).catch(next);
		} else {
			next(new ServerError(400, 'Bad request'));
		}
	},
};
