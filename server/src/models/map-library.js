'use strict';
const { MapLibrary, Map, MapInfo, MapCredit } = require('../../config/sqlize');

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
		return MapLibrary.destroy({
			where: {
				userID: userID,
				mapID: mapID
			}
		});
	},

	addMapToLibrary: (userID, mapID) => {
		return MapLibrary.findOrCreate({
			where: {
				userID: userID,
				mapID: mapID
			}
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