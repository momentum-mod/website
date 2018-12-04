'use strict';
const util = require('util'),
	fs = require('fs'),
	crypto = require('crypto'),
	{ sequelize, Op, Map, MapInfo, MapCredit, User, Profile, Activity, MapStats, MapImage } = require('../../config/sqlize'),
	user = require('./user'),
	activity = require('./activity'),
	queryHelper = require('../helpers/query'),
	config = require('../../config/config'),
	deleteFile = util.promisify(fs.unlink);

const storeMapImage = (imageFile, imageName) => {
	const moveImageTo = util.promisify(imageFile.mv);
	const fileName = imageName + '.jpg';
	const basePath = __dirname + '/../../public/img/maps';
	const fullPath =  basePath + '/' + fileName;
	const downloadURL = config.baseUrl + '/img/maps/' + fileName;
	// TODO: resize/edit image?
	return moveImageTo(fullPath).then(() => {
		return Promise.resolve({
			fileName: fileName,
			basePath: basePath,
			fullPath: fullPath,
			downloadURL: downloadURL,
		});
	});
};

const genFileHash = (mapPath) => {
	return new Promise((resolve, reject) => {
		const hash = crypto.createHash('sha1').setEncoding('hex');
		fs.createReadStream(mapPath).pipe(hash)
		.on('error', err => reject(err))
		.on('finish', () => {
			resolve(hash.read())
		});
	});
};

const storeMapFile = (mapFile, mapModel) => {
	const moveMapTo = util.promisify(mapFile.mv);
	const fileName = mapModel.name + '.bsp';
	const basePath = __dirname + '/../../public/maps';
	const fullPath =  basePath + '/' + fileName;
	const downloadURL = config.baseUrl + '/api/maps/' + mapModel.id + '/download';
	// TODO: resize/edit image?
	return moveMapTo(fullPath).then(() => {
		return genFileHash(fullPath).then(hash => {
			return Promise.resolve({
				fileName: fileName,
				basePath: basePath,
				fullPath: fullPath,
				downloadURL: downloadURL,
				hash: hash
			})
		});
	});
};

const verifyMapNameNotTaken = (mapName) => {
	return Map.find({
		where: {
			name: mapName,
			statusFlag: {[Op.notIn]: [STATUS.REJECTED, STATUS.REMOVED]}
		}
	}).then(mapWithSameName => {
		if (mapWithSameName) {
			const err = new Error('Map name already used');
			err.status = 409;
			return Promise.reject(err);
		}
	});
}

const verifyMapUploadLimitNotReached = (submitterID) => {
	const mapUploadLimit = 1;
	return Map.count({
		where: {
			submitterID: submitterID,
			statusFlag: STATUS.PENDING,
		},
	}).then(count => {
		if (count >= mapUploadLimit) {
			const err = new Error('Map creation limit reached');
			err.status = 409;
			return Promise.reject(err);
		}
	});
}

const onMapStatusUpdate = (mapID, previousStatus, newStatus, transaction) => {
	if (previousStatus === STATUS.PENDING && newStatus === STATUS.APPROVED)
		return onMapApproval(mapID, transaction);
}

const onMapApproval = (mapID, transaction) => {
	return MapCredit.findAll({
		where: { mapID: mapID, type: CreditType.AUTHOR },
	}).then(credits => {
		const activities = [];
		for (const credit of credits) {
			activities.push(
				activity.create({
					type: activity.ACTIVITY_TYPES.MAP_APPROVED,
					userID: credit.userID,
					data: mapID,
				}, transaction)
			);
		}
		if (activities.length)
			return Promise.all(activities);
	});
}

const STATUS = Object.freeze({
	APPROVED: 0,
	PENDING: 1,
	NEEDS_REVISION: 2,
	PRIVATE_TESTING: 3,
	PUBLIC_TESTING: 4,
	READY_FOR_RELEASE: 5,
	REJECTED: 6,
	REMOVED: 7,
});

const CreditType = Object.freeze({
	AUTHOR: 0,
	TESTER: 1,
	SPECIAL_THANKS: 2,
});

module.exports = {

	STATUS,
	CreditType,

	getAll: (context) => {
		const allowedExpansions = ['info', 'credits'];
		const queryContext = {
			distinct: true,
			include: [],
			where: {},
			limit: 20,
			order: [['createdAt', 'DESC']]
		};
		if (context.limit && !isNaN(context.limit))
			queryContext.limit = Math.min(Math.max(parseInt(context.limit), 1), 20);
		if (context.offset && !isNaN(context.offset))
			queryContext.offset = Math.min(Math.max(parseInt(context.offset), 0), 5000);
		if (context.submitterID)
			queryContext.where.submitterID = context.submitterID;
		if (context.search)
			queryContext.where.name = {[Op.like]: '%' + context.search + '%'}
		if (context.status && context.statusNot) {
			queryContext.where.statusFlag = {
				[Op.and]: {
					[Op.in]: context.status.split(','),
					[Op.notIn]: context.statusNot.split(','),
				}
			}
		} else if (context.status) {
			queryContext.where.statusFlag = {[Op.in]: context.status.split(',')};
		} else if (context.statusNot) {
			queryContext.where.statusFlag = {[Op.notIn]: context.statusNot.split(',')};
		}
		if (context.priority || (context.expand && context.expand.includes('submitter'))) {
			queryContext.include.push({
				model: User,
				as: 'submitter',
				include: [Profile],
				where: {}
			});
		}
		if (context.priority) { // :'(
			const priority = context.priority === 'true';
			const priorityPerms = [
				user.Permission.ADMIN,
				user.Permission.MODERATOR,
				user.Permission.MAPPER
			];
			const permChecks = [];
			for (let i = 0; i < priorityPerms.length; i++) {
				permChecks.push(
					sequelize.literal('permissions & ' + priorityPerms[i]
						+ (priority ? ' != ' : ' = ') + '0')
				);
			}
			queryContext.include[0].where.permissions = {
				[priority ? Op.or : Op.and]: permChecks
			};
		}
		queryHelper.addExpansions(queryContext, context.expand, allowedExpansions);
		return Map.findAndCountAll(queryContext);
	},

	get: (mapID, context) => {
		const allowedExpansions = ['info', 'credits', 'submitter', 'images', 'mapStats'];
		const queryContext = { where: { id: mapID }};
		if ('status' in context)
			queryContext.where.statusFlag = {[Op.in]: context.status.split(',')}
		queryHelper.addExpansions(queryContext, context.expand, allowedExpansions);
		return Map.find(queryContext);
	},

	create: (map) => {
		return verifyMapUploadLimitNotReached(map.submitterID)
		.then(() => {
			return verifyMapNameNotTaken(map.name);
		}).then(() => {
			return sequelize.transaction(t => {
				if (!map.info) map.info = {};
				map.stats = {};
				return Map.create(map, {
					include: [
						{ model: MapInfo, as: 'info' },
						{ model: MapCredit, as: 'credits' },
						{ model: MapStats, as: 'stats' }
					],
					transaction: t
				});
			});
		});
	},

	update: (mapID, map) => {
		return sequelize.transaction(t => {
			return Map.findById(mapID, {
				statusFlag: {[Op.notIn]: [STATUS.REJECTED, STATUS.REMOVED]},
				transaction: t
			}).then(mapToUpdate => {
				if (mapToUpdate) {
					const previousMapStatus = mapToUpdate.statusFlag;
					return mapToUpdate.update(map, {
						transaction: t
					}).then(() => {
						if ('statusFlag' in map && previousMapStatus !== map.statusFlag)
							return onMapStatusUpdate(mapID, previousMapStatus, map.statusFlag, t);
					});
				}
			});
		});
	},

	getInfo: (mapID) => {
		return MapInfo.find({
			where: { mapID: mapID }
		});
	},

	updateInfo: (mapID, mapInfo) => {
		return MapInfo.update(mapInfo, {
			where: { mapID: mapID }
		});
	},

	getCredits: (mapID, context) => {
		const allowedExpansions = ['user'];
		const queryContext = { where: { mapID: mapID }};
		queryHelper.addExpansions(queryContext, context.expand, allowedExpansions);
		return MapCredit.findAll(queryContext);
	},

	getCredit: (mapID, mapCredID, context) => {
		const allowedExpansions = ['user'];
		const queryContext = {
			where: {
				id: mapCredID,
				mapID: mapID
			}
		};
		queryHelper.addExpansions(queryContext, context.expand, allowedExpansions);
		return MapCredit.find(queryContext);
	},

	createCredit: (mapID, mapCredit) => {
		mapCredit.mapID = mapID;
		return MapCredit.create(mapCredit);
	},

	updateCredit: (mapID, mapCredID, mapCredit) => {
		return MapCredit.update(mapCredit, {
			where: {
				id: mapCredID,
				mapID: mapID
			}
		});
	},

	deleteCredit: (mapID, mapCredID) => {
		return MapCredit.destroy({
			where: {
				id: mapCredID,
				mapID: mapID
			}
		});
	},

	updateAvatar: (mapID, avatarFile) => {
		let mapModel = null;
		return Map.findById(mapID, {
			include: [
				{ model: MapInfo, as: 'info' }
			],
		}).then(map => {
			if (!map) {
				const err = new Error('Map does not exist');
				err.status = 404;
				return Promise.reject(err);
			}
			mapModel = map;
			return storeMapImage(avatarFile, map.name);
		}).then((results) => {
			return mapModel.info.update({
				avatarURL: results.downloadURL,
			});
		});
	},

	verifySubmitter: (mapID, userID) => {
		return new Promise((resolve, reject) => {
			Map.findById(mapID).then(map => {
				if (map && map.submitterID === userID) {
					resolve();
				} else {
					const err = new Error('Forbidden');
					err.status = 403;
					reject(err);
				}
			});
		});
	},

	upload: (mapID, mapFile) => {
		let mapModel = null;
		return Map.findById(mapID).then(map => {
			if (!map) {
				const err = new Error('Map does not exist');
				err.status = 404;
				return Promise.reject(err);
			} else if (map.statusFlag !== STATUS.NEEDS_REVISION) {
				const err = new Error('Map file cannot be uploaded given the map state');
				err.status = 409;
				return Promise.reject(err);
			}
			mapModel = map;
			return storeMapFile(mapFile, map);
		}).then((results) => {
			mapModel.update({
				statusFlag: STATUS.PENDING,
				downloadURL: results.downloadURL,
				hash: results.hash,
			});
		});
	},

	getFilePath: (mapID) => {
		return Map.findById(mapID).then(map => {
			if (!map) {
				const err = new Error('Map does not exist');
				err.status = 404;
				return Promise.reject(err);
			}
			const mapFileName = map.name + '.bsp';
			const filePath = __dirname + '/../../public/maps/' + mapFileName;
			return Promise.resolve(filePath);
		});
	},

	incrementDownloadCount: (mapID) => {
		MapStats.update({
			totalDownloads: sequelize.literal('totalDownloads + 1')
		}, { where: { mapID: mapID }});
	},

	getImages: (mapID) => {
		return MapImage.findAll({
			where: {mapID: mapID},
		});
	},

	createImage: (mapID, mapImageFile) => {
		const mapImageLimit = 5;
		return MapImage.count({
			where: { mapID: mapID }
		}).then(count => {
			if (count >= mapImageLimit) {
				const err = new Error('Map image file limit reached');
				err.status = 409;
				return Promise.reject(err);
			}
			return sequelize.transaction(t => {
				let newMapImage = null;
				return MapImage.create({
					mapID: mapID
				}).then(mapImage => {
					newMapImage = mapImage;
					return storeMapImage(mapImageFile, mapImage.id);
				}).then(results => {
					return newMapImage.update({
						URL: results.downloadURL
					});
				});
			});
		});
	},

	getImage: (imgID) => {
		return MapImage.findById(imgID);
	},

	updateImage: (imgID, mapImageFile) => {
		let mapImageModel = null;
		return MapImage.findById(imgID).then(mapImage => {
			if (!mapImage) {
				const err = new Error('Map image not found');
				err.status = 404;
				return Promise.reject(err);
			}
			mapImageModel = mapImage;
			return storeMapImage(mapImageFile, imgID);
		}).then(results => {
			return mapImageModel.update({
				URL: results.downloadURL
			});
		});
	},

	deleteImage: (imgID) => {
		if (isNaN(imgID)) {
			const err = new Error('Invalid image ID');
			err.status = 400;
			return Promise.reject(err);
		}
		return deleteFile(__dirname + '/../../public/img/maps/' + imgID + '.jpg')
		.then(() => {
			return MapImage.destroy({
				where: { id: imgID }
			});
		});
	},

};
