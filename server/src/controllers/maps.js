'use strict';
const map = require('../models/map'),
    user = require('../models/user'),
	config = require('../../config/config'),
	mapCredit = require('../models/map-credit'),
	mapImage = require('../models/map-image'),
	ServerError = require('../helpers/server-error');

module.exports = {

	getAll: (req, res, next) => {
		req.query.statusNot = [
			map.STATUS.PENDING.toString(),
			map.STATUS.NEEDS_REVISION.toString(),
			map.STATUS.REJECTED.toString(),
			map.STATUS.REMOVED.toString(),
		].join(',');
		map.getAll(req.user.id, req.query).then(results => {
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
		map.get(req.params.mapID, req.user.id, req.query).then(map => {
			if (map) {
				return res.json(map);
			}
			next(new ServerError(404, 'Map not found'));
		}).catch(next);
	},

	create: (req, res, next) => {
		req.body.submitterID = req.user.id;
		map.create(req.body).then(map => {
			res.set('Location', `${config.baseURL_API}/api/maps/${map.id}/upload`);
			res.json(map);
		}).catch(next);
	},

	update: (req, res, next) => {
		map.checkPermissions(req.params.mapID, req.user).then(verify => {
			if (verify) {
				return map.verifySubmitter(req.params.mapID, req.user.id);
			} else {
				return;
			}
		}).then(() => {
			return map.update(req.params.mapID, req.body).then(() => {
				res.sendStatus(204);
			}).catch(next);
		}).catch(next);
	},

	getInfo: (req, res, next) => {
		map.getInfo(req.params.mapID).then(mapInfo => {
			if (mapInfo) {
				return res.json(mapInfo);
			}
			next(new ServerError(404, 'Map not found'));
		}).catch(next);
	},

	getZones: (req, res, next) => {
		map.getZones(req.params.mapID).then(mapMdl => {
			return res.json(mapMdl);
		}).catch(next);
	},

	updateInfo: (req, res, next) => {
		map.checkPermissions(req.params.mapID, req.user, true).then(verify => {
			if (verify) {
				if (verify === "No delete" && req.body.youtubeID == null) {
					return map.getInfo(req.params.mapID).then(mapInfo => {
						if (mapInfo.youtubeID) {
							next(new ServerError(403, 'Forbidden'));
						} else {
							return map.verifySubmitter(req.params.mapID, req.user.id);
						}
					}).catch(next);
				}
				return map.verifySubmitter(req.params.mapID, req.user.id);
			} else {
				return;
			}
		}).then(() => {
			return map.updateInfo(req.params.mapID, req.body).then(() => {
				res.sendStatus(204);
			}).catch(next);
		}).catch(next);
	},

	getCredits: (req, res, next) => {
		map.getCredits(req.params.mapID, req.query).then(mapCredits => {
			res.json({
				mapCredits: mapCredits
			});
		}).catch(next);
	},

	getCredit: (req, res, next) => {
		mapCredit.getCredit(req.params.mapID, req.params.mapCredID, req.query).then(mapCredit => {
			if (mapCredit)
				return res.json(mapCredit);
			next(new ServerError(404, 'Map credit not found'));
		}).catch(next);
	},

	createCredit: (req, res, next) => {
		map.checkPermissions(req.params.mapID, req.user, true).then(verify => {
			if (verify) {
				return map.verifySubmitter(req.params.mapID, req.user.id);
			} else {
				return;
			}
		}).then(() => {
			return mapCredit.createCredit(req.params.mapID, req.body).then(mapCredit => {
				res.json(mapCredit);
			}).catch(next);
		}).catch(next);
	},

	updateCredit: (req, res, next) => {
		map.checkPermissions(req.params.mapID, req.user, true).then(verify => {
			if (verify) {
				return map.verifySubmitter(req.params.mapID, req.user.id);
			} else {
				return;
			}
		}).then(() => {
			return mapCredit.updateCredit(req.params.mapID, req.params.mapCredID, req.body).then(() => {
				res.sendStatus(204);
			}).catch(next);
		}).catch(next);
	},

	deleteCredit: (req, res, next) => {
		map.checkPermissions(req.params.mapID, req.user).then(verify => {
			if (verify) {
				return map.verifySubmitter(req.params.mapID, req.user.id);
			} else {
				return;
			}
		}).then(() => {
			return mapCredit.deleteCredit(req.params.mapID, req.params.mapCredID).then(() => {
				res.sendStatus(200);
			}).catch(next);
		}).catch(next);
	},

	updateThumbnail: (req, res, next) => {
		if (req.files && req.files.thumbnailFile) {
			map.checkPermissions(req.params.mapID, req.user).then(verify => {
				if (verify) {
					return map.verifySubmitter(req.params.mapID, req.user.id);
				} else {
					return;
				}
			}).then(() => {
				return mapImage.updateThumbnail(req.params.mapID, req.files.thumbnailFile.data).then(() => {
					res.sendStatus(204);
				}).catch(next);
			}).catch(next);
		} else {
			next(new ServerError(400, 'No image file provided'));
		}
	},

	getUploadLocation: (req, res, next) => {
		map.verifySubmitter(req.params.mapID, req.user.id).then(() => {
			res.set('Location', `${config.baseURL_API}/api/maps/${req.params.mapID}/upload`);
			res.sendStatus(204);
		}).catch(next);
	},

	upload: (req, res, next) => {
		if (req.files && req.files.mapFile) {
			map.checkPermissions(req.params.mapID, req.user).then(verify => {
				if (!verify) return;
				return map.verifySubmitter(req.params.mapID, req.user.id);
			}).then(() => {
				return map.upload(req.params.mapID, req.files.mapFile.data).then(() => {
					res.sendStatus(200);
				}).catch(next);
			}).catch(next);
		} else {
			next(new ServerError(400, 'No map file provided'));
		}
	},

	download: (req, res, next) => {
		map.getFilePath(req.params.mapID).then(path => {
			res.download(path);
			map.incrementDownloadCount(req.params.mapID);
		}).catch(next);
	},

	getImages: (req, res, next) => {
		mapImage.getAll(req.params.mapID).then(images => {
			if (images)
				return res.json({ images: images });
			next(new ServerError(404, 'Map not found'));
		}).catch(next);
	},

	createImage: (req, res, next) => {
		if (req.files && req.files.mapImageFile) {
			map.checkPermissions(req.params.mapID, req.user).then(verify => {
				if (verify) {
					return map.verifySubmitter(req.params.mapID, req.user.id);
				} else {
					return;
				}
			}).then(() => {
				return mapImage.create(req.params.mapID, req.files.mapImageFile.data).then(image => {
					res.json(image);
				}).catch(next);
			}).catch(next);
		} else {
			next(new ServerError(400, 'No map image file provided'));
		}
	},

	getImage: (req, res, next) => {
		mapImage.get(req.params.imgID).then(image => {
			if (image)
				return res.json(image);
			next(new ServerError(404, 'Map image not found'));
		}).catch(next);
	},

	updateImage: (req, res, next) => {
		map.checkPermissions(req.params.mapID, req.user).then(verify => {
			if (verify) {
				return map.verifySubmitter(req.params.mapID, req.user.id);
			} else {
				return;
			}
		}).then(() => {
			return mapImage.update(req.params.imgID).then(() => {
				res.sendStatus(204);
			}).catch(next);
		}).catch(next);
	},

	deleteImage: (req, res, next) => {
		map.checkPermissions(req.params.mapID, req.user).then(verify => {
			if (verify) {
				return map.verifySubmitter(req.params.mapID, req.user.id);
			} else {
				return;
			}
		}).then(() => {
			return mapImage.delete(req.params.imgID).then(() => {
				res.sendStatus(204);
			}).catch(next);
		}).catch(next);
	}

}
