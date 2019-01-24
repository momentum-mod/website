'use strict';
const util = require('util'),
	fs = require('fs'),
	crypto = require('crypto'),
	{ sequelize, Op, Map, MapInfo, MapCredit, User,
		MapStats, MapZoneStats, BaseStats, MapFavorite, MapLibraryEntry, UserMapRank, Run
	} = require('../../config/sqlize'),
	user = require('./user'),
	activity = require('./activity'),
	queryHelper = require('../helpers/query'),
	config = require('../../config/config');

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
	const authorIDs = [];
	return MapCredit.findAll({
		where: { mapID: mapID, type: CreditType.AUTHOR },
	}).then(credits => {
		const activities = [];
		for (const credit of credits) {
			authorIDs.push(credit.userID);
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
		else
			return Promise.resolve();
	}).then(() => {
		return User.update({
			permissions: sequelize.literal('permissions | ' + user.Permission.MAPPER),
		}, {
			where: { id: {[Op.in]: authorIDs }},
			transaction: transaction,
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

const CreditType = Object.freeze({
	AUTHOR: 0,
	TESTER: 1,
	SPECIAL_THANKS: 2,
});

const MAP_TYPE = Object.freeze({
	UNKNOWN: 0,
	SURF: 1,
	BHOP: 2,
	KZ: 3,
	RJ: 4,
	TRICKSURF: 5,
	TRIKZ: 6,
});

module.exports = {

	STATUS,
	CreditType,
	MAP_TYPE,

	getAll: (userID, queryParams) => {
		const allowedExpansions = ['info', 'credits', 'thumbnail'];
		const queryOptions = {
			distinct: true,
			include: [],
			where: {},
			limit: 20,
			order: [['createdAt', 'DESC']]
		};
		if (queryParams.limit && !isNaN(queryParams.limit))
			queryOptions.limit = Math.min(Math.max(parseInt(queryParams.limit), 1), 20);
		if (queryParams.offset && !isNaN(queryParams.offset))
			queryOptions.offset = Math.min(Math.max(parseInt(queryParams.offset), 0), 5000);
		if (queryParams.submitterID)
			queryOptions.where.submitterID = queryParams.submitterID;
		let nameSearch = queryParams.search || queryParams.name;
		if (nameSearch)
			queryOptions.where.name = {[Op.like]: '%' + nameSearch + '%'};
		if (queryParams.type)
			queryOptions.where.type = {[Op.in]: queryParams.type.split(',')};
		if (queryParams.status && queryParams.statusNot) {
			queryOptions.where.statusFlag = {
				[Op.and]: {
					[Op.in]: queryParams.status.split(','),
					[Op.notIn]: queryParams.statusNot.split(','),
				}
			}
		} else if (queryParams.status) {
			queryOptions.where.statusFlag = {[Op.in]: queryParams.status.split(',')};
		} else if (queryParams.statusNot) {
			queryOptions.where.statusFlag = {[Op.notIn]: queryParams.statusNot.split(',')};
		}
		if ('priority' in queryParams || (queryParams.expand && queryParams.expand.includes('submitter'))) {
			queryOptions.include.push({
				model: User,
				as: 'submitter',
				where: {}
			});
		}
		if ('priority' in queryParams) {
			const priorityPerms = [
				user.Permission.ADMIN,
				user.Permission.MODERATOR,
				user.Permission.MAPPER
			];
			const permChecks = [];
			for (let i = 0; i < priorityPerms.length; i++) {
				permChecks.push(
					sequelize.literal('permissions & ' + priorityPerms[i]
						+ (queryParams.priority ? ' != ' : ' = ') + '0')
				);
			}
			queryOptions.include[0].where.permissions = {
				[queryParams.priority ? Op.or : Op.and]: permChecks
			};
		}
		if (queryParams.expand) {
			queryHelper.addExpansions(queryOptions, queryParams.expand, allowedExpansions);
			const expansionNames = queryParams.expand.split(',');
			if (expansionNames.includes('inFavorites')) {
				queryOptions.include.push({
					model: MapFavorite,
					as: 'favorites',
					where: { userID: userID },
					required: false,
				});
			}
			if (expansionNames.includes('inLibrary')) {
				queryOptions.include.push({
					model: MapLibraryEntry,
					as: 'libraryEntries',
					where: { userID: userID },
					required: false,
				});
			}
			if (expansionNames.includes('personalBest')) {
				queryOptions.include.push({
					model: UserMapRank,
					as: 'personalBest',
					where: { userID: userID },
					include: [Run, User],
					required: false,
				});
			}
			if (expansionNames.includes('worldRecord')) {
				queryOptions.include.push({
					model: UserMapRank,
					as: 'worldRecord',
					where: { rank: 1 },
					include: [Run, User],
					required: false,
				});
			}
		}
		return Map.findAndCountAll(queryOptions);
	},

	get: (mapID, userID, queryParams) => {
		const allowedExpansions = ['info', 'credits', 'submitter', 'images', 'thumbnail', 'mapStats'];
		const queryOptions = { include: [], where: { id: mapID }};
		if ('status' in queryParams)
			queryOptions.where.statusFlag = {[Op.in]: queryParams.status.split(',')};
		if (queryParams.expand) {
			queryHelper.addExpansions(queryOptions, queryParams.expand, allowedExpansions);
			const expansionNames = queryParams.expand.split(',');
			if (expansionNames.includes('inFavorites')) {
				queryOptions.include.push({
					model: MapFavorite,
					as: 'favorites',
					where: { userID: userID },
					required: false,
				});
			}
			if (expansionNames.includes('inLibrary')) {
				queryOptions.include.push({
					model: MapLibraryEntry,
					as: 'libraryEntries',
					where: { userID: userID },
					required: false,
				});
			}
		}
		return Map.find(queryOptions);
	},

	create: (map) => {
		if (!map.info) {
			const err = new Error("Missing info block");
			err.status = 400;
			return Promise.reject(err);
		}
		return verifyMapUploadLimitNotReached(map.submitterID)
		.then(() => {
			return verifyMapNameNotTaken(map.name);
		}).then(() => {
			return sequelize.transaction(t => {
				if (map.info.numZones) {
					const zoneStats = [];
					for (let i = 0; i < map.info.numZones + 1; i++) {
						zoneStats.push({
							zoneNum: i,
							baseStats: {},
						});
					}
					map.stats = {
						zoneStats: zoneStats,
					};
					return Map.create(map, {
						include: [
							{ model: MapInfo, as: 'info' },
							{ model: MapCredit, as: 'credits' },
							{
								model: MapStats,
								as: 'stats',
								include: [{
									model: MapZoneStats,
									as: 'zoneStats',
									include: [{
										model: BaseStats,
										as: 'baseStats',
									}]
								}]
							}
						],
						transaction: t
					}).then(mapModel => {
						if (map.credits && map.credits.length) {
							const activities = [];
							for (const credit of map.credits) {
								activities.push(
									activity.create({
										type: activity.ACTIVITY_TYPES.MAP_UPLOADED,
										userID: credit.userID,
										data: mapModel.id,
									}, t)
								);
							}
							return Promise.all(activities).then(() => {
								return Promise.resolve(mapModel);
							});
						} else {
							return Promise.resolve(mapModel);
						}
					});
				} else {
					const err = new Error('Invalid number of zones in map');
					err.status = 400;
					return Promise.reject(err);
				}
			});
		});
	},

	update: (mapID, map) => {
		return sequelize.transaction(t => {
			return Map.findById(mapID, {
				where: { statusFlag: {[Op.notIn]: [STATUS.REJECTED, STATUS.REMOVED]}},
				transaction: t
			}).then(mapToUpdate => {
				if (mapToUpdate) {
					const previousMapStatus = mapToUpdate.statusFlag;
					return mapToUpdate.update(map, {
						transaction: t
					}).then(() => {
						if ('statusFlag' in map && previousMapStatus !== map.statusFlag)
							return onMapStatusUpdate(mapID, previousMapStatus, map.statusFlag, t);
						else
							return Promise.resolve();
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

	getCredits: (mapID, queryParams) => {
		const allowedExpansions = ['user'];
		const queryOptions = { where: { mapID: mapID }};
		queryHelper.addExpansions(queryOptions, queryParams.expand, allowedExpansions);
		return MapCredit.findAll(queryOptions);
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

};
