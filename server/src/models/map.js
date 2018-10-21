'use strict';
const util = require('util'),
	{ sequelize, Op, Map, MapInfo, MapCredit, User } = require('../../config/sqlize'),
	ActivityMdl = require('./activity'),
	config = require('../../config/config');

const STATUS = Object.freeze({
	APPROVED: 0,
	NEEDS_UPLOAD: 1,
	PENDING: 2,
	NEEDS_REVISION: 3,
	DENIED: 4,
});

module.exports = {
	STATUS,

	getAll: (context) => {
		const queryContext = {
			include: [
				{ model: MapInfo, as: 'info' },
				{ model: MapCredit, as: 'credits' }
			],
			where: {
				name: {
					[Op.like]: '%' + (context.search || '') + '%' // 2 spooky 5 me O:
				}
			},
			offset: parseInt(context.page) || 0,
			limit: parseInt(context.limit) || 20
		};
		if (context.submitterID) queryContext.where.submitterID = context.submitterID;
		if ('statusFlag' in context) queryContext.where.statusFlag = context.statusFlag;
		return Map.findAll(queryContext);
	},

	get: (mapID, context) => {
		const queryContext = {
			include: [
				{ model: MapInfo, as: 'info' },
				{ model: MapCredit, as: 'credits' }
			],
			where: { id: mapID }
		};
		if ('statusFlag' in context) queryContext.where.statusFlag = context.statusFlag;
		return Map.find(queryContext);
	},

	create: (map) => {
		// TODO: add regex map name check when Joi validation added
		// something like this /^[a-zA-Z0-9_!]+$/ (alphanum + )
		return Map.find({
			where: { name: map.name }
		}).then(mapWithSameName => {
			if (mapWithSameName) {
				const err = new Error('Map name already used');
				err.status = 409;
				return Promise.reject(err);
			}
			return Map.create(map, {
				include: [
					{ model: MapInfo, as: 'info' },
					{ model: MapCredit, as: 'credits' }
				]
			});
		});
	},

	update: (mapID, map) => {
		const updates = [
			Map.update(map, { where: { id: mapID }})
		];
		if (map.mapInfo) {
			updates.push(
				MapInfo.update(map.mapInfo, {
					where: { mapID: mapID }
				})
			);
		}
		return Promise.all(updates);
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
		return MapCredit.findAll({
			where: { mapID: mapID }
		});
	},

	getCredit: (mapID, mapCredID) => {
		return MapCredit.find({
			where: {
				id: mapCredID,
				mapID: mapID
			}
		});
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
		const moveAvatarTo = util.promisify(avatarFile.mv);
		let avatarFileLocation = 'img/maps/';
		return Map.find({
			where: { id: mapID }
		}).then(map => {
			if (!map) {
				const err = new Error('Map does not exist');
				err.status = 404;
				return Promise.reject(err);
			}
			// TODO: resize/edit image?
			avatarFileLocation += map.name + '.jpg';
			return moveAvatarTo(__dirname + '/../../public/' + avatarFileLocation);
		}).then((results) => {
			return MapInfo.update({
				avatarURL: config.baseUrl + '/' + avatarFileLocation
			}, {
				where: { id: mapID }
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
		const moveMapFileTo = util.promisify(mapFile.mv);
		let mapFileLocation = 'maps/';
		let mapInfo = null;
		return Map.find({
			where: { id: mapID }
		}).then(map => {
			if (!map) {
				const err = new Error('Map does not exist');
				err.status = 404;
				return Promise.reject(err);
			} else if (map.statusFlag !== STATUS.NEEDS_UPLOAD) {
				const err = new Error('Map file cannot be uploaded given the map state');
				err.status = 409;
				return Promise.reject(err);
			}
			mapInfo = map;
			mapFileLocation += map.name + '.bsp';
			return moveMapFileTo(__dirname + '/../../public/' + mapFileLocation);
		}).then(() => {
			return sequelize.transaction(t => {
				return Map.update({
					statusFlag: STATUS.PENDING,
					download: config.baseUrl + '/api/maps/' + mapInfo.id + '/download'
				}, {
					where: { id: mapID },
					transaction: t
				}).then(() => {
					return ActivityMdl.create({
						type: ActivityMdl.ACTIVITY_TYPES.MAP_SUBMITTED,
						userID: mapInfo.submitterID, // TODO: Consider firing this for every author?
						data: mapInfo.id,
					}, {transaction: t});
				});
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
		})
	}

};
