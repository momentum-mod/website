'use strict';
const map = require('../models/map'),
	mapCredit = require('../models/map-credit'),
	mapImage = require('../models/map-image'),
	config = require('../../config/config');

const genMapNotFoundErr = () => {
	const err = new Error('Map not found');
	err.status = 404;
	return err;
}

const genMapCreditNotFoundErr = () => {
	const err = new Error('Map credit not found');
	err.status = 404;
	return err;
}

const genMapImageNotFoundErr = () => {
	const err = new Error('Map image not found');
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
		map.getAll(req.user.id, req.query)
		.then(results => {
	        res.json({
				count: results.count,
	        	maps: results.rows
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
		if (req.query.expand)
			req.query.expand = req.query.expand.replace(/stats/g, 'mapStats');
		map.get(req.params.mapID, req.user.id, req.query)
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
		mapCredit.getCredit(req.params.mapID, req.params.mapCredID, req.query)
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
			return mapCredit.createCredit(req.params.mapID, req.body);
		}).then(mapCredit => {
			res.json(mapCredit);
		}).catch(next);
	},

	updateCredit: (req, res, next) => {
		map.verifySubmitter(req.params.mapID, req.user.id)
		.then(() => {
			return mapCredit.updateCredit(req.params.mapID, req.params.mapCredID, req.body);
		}).then(() => {
			res.sendStatus(204);
		}).catch(next);
	},

	deleteCredit: (req, res, next) => {
		map.verifySubmitter(req.params.mapID, req.user.id)
		.then(() => {
			return mapCredit.deleteCredit(req.params.mapID, req.params.mapCredID);
		}).then(() => {
			res.sendStatus(200);
		}).catch(next);
	},

	updateThumbnail: (req, res, next) => {
		if (req.files && req.files.thumbnailFile) {
			map.verifySubmitter(req.params.mapID, req.user.id)
			.then(() => {
				return mapImage.updateThumbnail(req.params.mapID, req.files.thumbnailFile.data);
			}).then(() => {
				res.sendStatus(204);
			}).catch(next);
		} else {
			const err = new Error('No image file provided');
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
	},

	getImages: (req, res, next) => {
		mapImage.getAll(req.params.mapID)
		.then(images => {
			if (images)
				return res.json({ images: images });
			next(genMapNotFoundErr());
		}).catch(next);
	},

	createImage: (req, res, next) => {
		if (req.files && req.files.mapImageFile) {
			map.verifySubmitter(req.params.mapID, req.user.id)
			.then(() => {
				return mapImage.create(req.params.mapID, req.files.mapImageFile.data);
			}).then(image => {
				res.json(image);
			}).catch(next);
		} else {
			const err = new Error('No map image file provided');
			err.status = 400;
			next(err);
		}
	},

	getImage: (req, res, next) => {
		mapImage.get(req.params.imgID)
		.then(image => {
			if (image)
				return res.json(image);
			next(genMapImageNotFoundErr());
		}).catch(next);
	},

	updateImage: (req, res, next) => {
		if (req.files && req.files.mapImageFile) {
			map.verifySubmitter(req.params.mapID, req.user.id)
			.then(() => {
				return mapImage.update(req.params.imgID, req.files.mapImageFile.data);
			}).then(() => {
				res.sendStatus(204);
			}).catch(next);
		} else {
			const err = new Error('No map image file provided');
			err.status = 400;
			next(err);
		}
	},

	deleteImage: (req, res, next) => {
		map.verifySubmitter(req.params.mapID, req.user.id)
		.then(() => {
			return mapImage.delete(req.params.imgID);
		}).then(() => {
			res.sendStatus(204);
		}).catch(next);
	}

}
