'use strict';
const { Op, Map, MapInfo, MapCredit, User } = require('../../config/sqlize'),
	ActivityMdl = require('./activity'),
	config = require('../../config/config');

module.exports = {

	getAll: (context) => {
		const queryContext = {
			include: [MapInfo, MapCredit],
			where: {
				name: {
					[Op.like]: '%' + (context.search || '') + '%' // 2 spooky 5 me O:
				},
				statusFlag: 1
			},
			offset: parseInt(context.page) || 0,
			limit: parseInt(context.limit) || 20
		};
		return Map.findAll(queryContext);
	},

	get: (mapID) => {
		return Map.find({
			include: [MapInfo, MapCredit],
			where: { id: mapID, statusFlag: 1 }
		});
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
				include: [MapInfo, MapCredit]
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
		return Map.find({
			where: { id: mapID }
		}).then(map => {
			if (!map) {
				const err = new Error('Map does not exist');
				err.status = 404;
				return Promise.reject(err);
			} else if (map.statusFlag !== 0) {
				const err = new Error('Map file cannot be uploaded again');
				err.status = 409;
				return Promise.reject(err);
			}
			const mapFileName = map.name + '.bsp';
			mapFile.mv(__dirname + '/../../public/maps/' + mapFileName, (err) => {
				if (err)
					return Promise.reject(err);
			});
		}).then(() => {
			Map.update({ statusFlag: 1 }, {
				where: { id: mapID }
			}).then((map) => {

				// Create the activity for this
				var act = ActivityMdl.createActivity({
					type: ActivityMdl.ACTIVITY_TYPES.MAP_SUBMITTED,
					userID: map.submitterID, // TODO: Consider firing this for every author?
					data: mapID,
				});

				console.log(act); // TODO REMOVEME

				return Promise.resolve(map)
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
