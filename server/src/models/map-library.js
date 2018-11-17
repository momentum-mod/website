'use strict';
const { sequelize, MapLibrary, Map, MapInfo, MapCredit, MapStats } = require('../../config/sqlize');

module.exports = {

	getUserLibrary: (userID) => {
		return MapLibrary.findAll({
			where: { userID: userID },
			include: [
				{
					model: Map,
					include: [
						{
							model: MapInfo,
							as: 'info'
						},
						{
							model: MapCredit,
							as: 'credits',
						}
					]
				},
			]
		});
	},

	removeMapFromLibrary: (userID, mapID) => {
		return sequelize.transaction(t => {
			return MapLibrary.destroy({
				where: {
					userID: userID,
					mapID: mapID
				},
				transaction: t
			}).then(rowsAffected => {
				if (!rowsAffected)
					return Promise.resolve();
				return MapStats.update({
					totalSubscriptions: sequelize.literal('totalSubscriptions - 1')
				}, {
					where: { mapID: mapID },
					transaction: t
				});
			});
		});
	},

	addMapToLibrary: (userID, mapID) => {
		return sequelize.transaction(t => {
			let mapLibModel = null;
			return MapLibrary.findOrCreate({
				where: {
					userID: userID,
					mapID: mapID
				},
				transaction: t
			}).spread((mapLibEntry, created) => {
				mapLibModel = mapLibEntry;
				if (!created)
					return Promise.resolve();
				return MapStats.update({
					totalSubscriptions: sequelize.literal('totalSubscriptions + 1')
				}, {
					where: { mapID: mapID },
					transaction: t
				});
			}).then(() => {
				return Promise.resolve(mapLibModel);
			});
		});
	},

	isMapInLibrary: (userID, mapID) => {
		return MapLibrary.find({
			where: {
				userID: userID,
				mapID: mapID,
			}
		});
	}
};
