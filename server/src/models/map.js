'use strict';
const util = require('util'),
	{ sequelize, Op, Map, MapInfo, MapCredit, User, Profile, Leaderboard, Activity } = require('../../config/sqlize'),
	Sequelize = require('sequelize'),
	user = require('./user'),
	activity = require('./activity'),
	queryHelper = require('../helpers/query'),
	config = require('../../config/config');

const storeMapImage = (imageFile, mapName) => {
	const moveImageTo = util.promisify(imageFile.mv);
	const fileName = mapName + '.jpg';
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
}

const storeMapFile = (mapFile, mapName) => {
	const moveMapTo = util.promisify(mapFile.mv);
	const fileName = mapName + '.bsp';
	const basePath = __dirname + '/../../public/maps';
	const fullPath =  basePath + '/' + fileName;
	const downloadURL = config.baseUrl + '/maps/' + fileName;
	// TODO: resize/edit image?
	return moveMapTo(fullPath).then(() => {
		return Promise.resolve({
			fileName: fileName,
			basePath: basePath,
			fullPath: fullPath,
			downloadURL: downloadURL,
		});
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

module.exports = {
	STATUS,

	getAll: (context) => {
		const allowedExpansions = ['info', 'credits'];
		const queryContext = {
			include: [],
			where: {},
			offset: parseInt(context.page) || 0,
			limit: Math.min(parseInt(context.limit) || 20, 20)
		};
		if (context.submitterID) {
			queryContext.where.submitterID = context.submitterID;
		}
		if (context.search) {
			queryContext.where.name = {
				[Op.like]: '%' + context.search + '%' // 2 spooky 5 me O:
			}
		}
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
				attributes: {
					exclude: ['refreshToken']
				},
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
					Sequelize.literal('permissions & ' + priorityPerms[i]
						+ (priority ? ' != ' : ' = ') + '0')
				);
			}
			queryContext.include[0].where.permissions = {
				[priority ? Op.or : Op.and]: permChecks
			};
		}
		queryHelper.addExpansions(queryContext, context.expand, allowedExpansions);
		return Map.findAll(queryContext);
	},

	get: (mapID, context) => {
		const allowedExpansions = ['info', 'credits', 'submitter'];
		const queryContext = { where: { id: mapID }};
		if ('status' in context) {
			queryContext.where.statusFlag = {
				[Op.in]: context.status.split(',')
			}
		}
		queryHelper.addExpansions(queryContext, context.expand, allowedExpansions);
		return Map.find(queryContext);
	},

	create: (map) => {
		const mapUploadLimit = 3;
		return Map.count({
			where: {
				submitterID: map.submitterID,
				statusFlag: STATUS.PENDING,
			},
		}).then(count => {
			if (count >= mapUploadLimit) {
				const err = new Error('Map creation limit reached');
				err.status = 409;
				return Promise.reject(err);
			}
			return Map.find({
				where: {
					name: map.name,
					statusFlag: {
						[Op.notIn]: [STATUS.REJECTED, STATUS.REMOVED],
					}
				}
			});
		}).then(mapWithSameName => {
			if (mapWithSameName) {
				const err = new Error('Map name already used');
				err.status = 409;
				return Promise.reject(err);
			}
			if (!map.info) map.info = {};
			return Map.create(map, {
				include: [
					{ model: MapInfo, as: 'info' },
					{ model: MapCredit, as: 'credits' }
				],
			});
		});
	},

	update: (mapID, map) => {
		return sequelize.transaction(t => {
			let mapInfo = null;
			return Map.find({
				where: { id: mapID },
				transaction: t
			}).then(mapToUpdate => {
				mapInfo = mapToUpdate;
				return Map.update(map, {
					where: {
						id: mapID,
						statusFlag: {
							[Op.notIn]: [STATUS.REJECTED, STATUS.REMOVED]
						}
					},
					transaction: t
				});
			}).then(() => {
				if (map.statusFlag !== STATUS.APPROVED) {
					return Promise.resolve();
				}
				return Activity.create({
					type: activity.ACTIVITY_TYPES.MAP_APPROVED,
					userID: mapInfo.submitterID, // TODO: Consider firing this for every author?
					data: mapInfo.id,
				}, {
					transaction: t
				}).then(activity => {
					return Leaderboard.create({
						mapID: mapID,
						enabled: true,
					}, {transaction: t});
				});
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
		return Map.find({
			where: { id: mapID },
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
			Map.find({
				where: { id: mapID }
			}).then(map => {
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
		return Map.find({
			where: { id: mapID }
		}).then(map => {
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
			return storeMapFile(mapFile, map.name);
		}).then((results) => {
			mapModel.update({
				statusFlag: STATUS.PENDING,
				downloadURL: results.downloadURL,
				//hash: mapFile.md5(), // (adds considerable time to response time) (SHA preferred?)
			});
		});
	},

	getFilePath: (mapID) => {
		return Map.find({
			where: { id: mapID }
		}).then(map => {
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
		MapInfo.update({
			totalDownloads: Sequelize.literal('totalDownloads + 1')
		}, { where: { mapID: mapID }});
	}

};
