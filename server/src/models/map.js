'use strict';
const { Op, Map, MapInfo, MapCredit, User } = require('../../config/sqlize'),
	config = require('../../config/config');

module.exports = {

	getAll: (context) => {
		const queryContext = {
			include: [MapInfo, MapCredit],
			where: {
				name: {
					[Op.like]: '%' + (context.search || '') + '%' // 2 spooky 5 me O:
				}
			},
			offset: parseInt(context.offset) || 0,
			limit: parseInt(context.limit) || 20
		};
		return Map.findAll(queryContext);
	},

	get: (mapID) => {
		return Map.find({
			include: [MapInfo, MapCredit],
			where: { id: mapID }
		});
	},

	create: (map) => {
		return Map.create(map, {
			include: [MapInfo, MapCredit]
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
				if (map && map.submitterID == userID) {
					resolve();
				} else {
					const err = new Error("Forbidden");
					err.status = 403;
					reject(err);
				}
			});
		});
	}

};
