'use strict';
const map = require('../models/map'),
	config = require('../../config/config');

// TODO: handle these controller errors better!?
const genMapNotFoundErr = () => {
	const err = new Error('Map Not Found');
	err.status = 404;
	return err;
}

const genMapCreditNotFoundErr = () => {
	const err = new Error('Map Credit Not Found');
	err.status = 404;
	return err;
}

module.exports = {

	getAll: (req, res, next) => {
		req.query.statusNot = [
			map.STATUS.PENDING.toString(),
			map.STATUS.NEEDS_REVISION.toString(),
			map.STATUS.REJECTED.toString(),
			map.STATUS.REMOVED.toString(),
		].join(',');
		map.getAll(req.query)
		.then(maps => {
	        res.json({
	        	maps: maps
	        });
		}).catch(next);
	},

	get: (req, res, next) => {
		req.query.statusNot = [
			map.STATUS.PENDING.toString(),
			map.STATUS.NEEDS_REVISION.toString(),
			map.STATUS.REJECTED.toString(),
			map.STATUS.REMOVED.toString(),
		].join(',');
		map.get(req.params.mapID, req.query)
		.then(map => {
			if (map) {
				return res.json(map);
			}
			next(genMapNotFoundErr());
		}).catch(next);
	},

	create: (req, res, next) => {
		req.body.submitterID = req.user.id;
		map.create(req.body)
		.then(map => {
			res.set('Location', '/api/maps/' + map.id + '/upload');
			res.json(map);
		}).catch(next);
	},

	update: (req, res, next) => {
		map.verifySubmitter(req.params.mapID, req.user.id)
		.then(() => {
			return map.update(req.params.mapID, req.body);
		}).then(() => {
			res.sendStatus(204);
		}).catch(next);
	},

	getInfo: (req, res, next) => {
		map.getInfo(req.params.mapID)
		.then(mapInfo => {
			if (mapInfo) {
				return res.json(mapInfo);
			}
			next(genMapNotFoundErr());
		}).catch(next);
	},

	updateInfo: (req, res, next) => {
		map.verifySubmitter(req.params.mapID, req.user.id)
		.then(() => {
			return map.updateInfo(req.params.mapID, req.body);
		}).then(() => {
			res.sendStatus(204);
		}).catch(next);
	},

	getCredits: (req, res, next) => {
		map.getCredits(req.params.mapID, req.query)
		.then(mapCredits => {
			res.json({
				mapCredits: mapCredits
			});
		}).catch(next);
	},

	getCredit: (req, res, next) => {
		map.getCredit(req.params.mapID, req.params.mapCredID, req.query)
		.then(mapCredit => {
			if (mapCredit) {
				return res.json(mapCredit);
			}
			next(genMapCreditNotFoundErr());
		}).catch(next);
	},

	createCredit: (req, res, next) => {
		map.verifySubmitter(req.params.mapID, req.user.id)
		.then(() => {
			return map.createCredit(req.params.mapID, req.body);
		}).then(mapCredit => {
			res.json(mapCredit);
		}).catch(next);
	},

	updateCredit: (req, res, next) => {
		map.verifySubmitter(req.params.mapID, req.user.id)
		.then(() => {
			return map.updateCredit(req.params.mapID, req.params.mapCredID, req.body);
		}).then(() => {
			res.sendStatus(204);
		}).catch(next);
	},

	deleteCredit: (req, res, next) => {
		map.verifySubmitter(req.params.mapID, req.user.id)
		.then(() => {
			return map.deleteCredit(req.params.mapID, req.params.mapCredID);
		}).then(() => {
			res.sendStatus(200);
		}).catch(next);
	},

	updateAvatar: (req, res, next) => {
		if (req.files && req.files.avatarFile) {
			map.verifySubmitter(req.params.mapID, req.user.id)
			.then(() => {
				return map.updateAvatar(req.params.mapID, req.files.avatarFile);
			}).then(result => {
				res.sendStatus(200);
			}).catch(next);
		} else {
			const err = new Error('No avatar file provided');
			err.status = 400;
			next(err);
		}
	},

	getUploadLocation: (req, res, next) => {
		map.verifySubmitter(req.params.mapID, req.user.id)
		.then(() => {
			res.set('Location', '/api/maps/' + req.params.mapID + '/upload');
			res.sendStatus(204);
		}).catch(next);
	},

	upload: (req, res, next) => {
		if (req.files && req.files.mapFile) {
			map.verifySubmitter(req.params.mapID, req.user.id)
			.then(() => {
				return map.upload(req.params.mapID, req.files.mapFile);
			}).then(result => {
				res.sendStatus(200);
			}).catch(next);
		} else {
			const err = new Error('No map file provided');
			err.status = 400;
			next(err);
		}
	},

	download: (req, res, next) => {
		map.getFilePath(req.params.mapID)
		.then(path => {
			res.download(path);
			map.incrementDownloadCount(req.params.mapID);
		}).catch(next);
	}

}
