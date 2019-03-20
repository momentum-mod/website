'use strict';
const imageEditor = require('sharp'),
	fs = require('fs'),
	config = require('../../config/config'),
	ServerError = require('../helpers/server-error'),
	{ sequelize, Map, MapImage } = require('../../config/sqlize');

const editAndSaveMapImageFile = (imageFileBuffer, fileName, width, height) => {
	const basePath = __dirname + '/../../public/img/maps/';
	const fullPath = basePath + fileName;
	const downloadURL = config.baseUrl + '/img/maps/' + fileName;
	return imageEditor(imageFileBuffer).resize(width, height, {
		fit: 'inside',
	}).toFile(fullPath).then(() => {
		return Promise.resolve({
			fullPath: fullPath,
			downloadURL: downloadURL,
		});
	}).catch(err => {
		err.status = 400;
		return Promise.reject(err);
	});
};

const storeMapImage = (imageFileBuffer, imgID) => {
	return Promise.all([
		editAndSaveMapImageFile(imageFileBuffer, imgID + '-small.jpg', 480, 360),
		editAndSaveMapImageFile(imageFileBuffer, imgID + '-medium.jpg', 1280, 720),
		editAndSaveMapImageFile(imageFileBuffer, imgID + '-large.jpg', 1920, 1080)
	]);
};

const deleteMapImageFile = (imgFileLocation) => {
	return new Promise((resolve, reject) => {
		fs.stat(imgFileLocation, err => {
			if (err) {
				if (err.code === 'ENOENT')
					return resolve();
				else
					return reject(err);
			}
			fs.unlink(imgFileLocation, err => {
				if (err)
					return reject(err);
				resolve();
			});  
		});
	});
};

const MAP_IMAGE_UPLOAD_LIMIT = 5;

module.exports = {

	getAll: (mapID) => {
		return MapImage.findAll({
			where: { mapID: mapID },
		});
	},

	create: (mapID, mapImageFile) => {
		let mapModel = null;
		return Map.findById(mapID, {
			raw: true
		}).then(map => {
			if (map) {
				mapModel = map;
				return MapImage.count({ where: { mapID: mapID }});
			}
			return Promise.reject(new ServerError(404, 'Map not found'));
		}).then(imageCount => {
			if (!mapModel.thumbnailID)
				imageCount++; // compensate for missing thumbnail image that can exist
			if (imageCount >= MAP_IMAGE_UPLOAD_LIMIT)
				return Promise.reject(new ServerError(409, 'Map image file limit reached'));
			return sequelize.transaction(t => {
				let newMapImage = null;
				return MapImage.create({ mapID: mapID }, {
					transaction: t,
				}).then(mapImage => {
					newMapImage = mapImage;
					return storeMapImage(mapImageFile, mapImage.id);
				}).then(results => {
					return newMapImage.update({
						small: results[0].downloadURL,
						medium: results[1].downloadURL,
						large: results[2].downloadURL,
					}, { transaction: t });
				});
			});
		});
	},

	get: (imgID) => {
		return MapImage.findById(imgID, {
			raw: true,
		});
	},

	update: (imgID, mapImageFile) => {
		let mapImageModel = null;
		return MapImage.findById(imgID).then(mapImage => {
			if (mapImage) {
				mapImageModel = mapImage;
				return storeMapImage(mapImageFile, imgID);
			}
			return Promise.reject(new ServerError(404, 'Map image not found'));
		}).then(results => {
			return mapImageModel.update({
				small: results[0].downloadURL,
				medium: results[1].downloadURL,
				large: results[2].downloadURL,
			});
		});
	},

	deleteMapImageFiles: (imgID) => {
		return Promise.all([
			deleteMapImageFile(__dirname + '/../../public/img/maps/' + imgID + '-small.jpg'),
			deleteMapImageFile(__dirname + '/../../public/img/maps/' + imgID + '-medium.jpg'),
			deleteMapImageFile(__dirname + '/../../public/img/maps/' + imgID + '-large.jpg')
		]);
	},

	delete: (imgID) => {
		return module.exports.deleteMapImageFiles(imgID).then(() => {
			return MapImage.destroy({
				where: { id: imgID },
			});
		});
	},

	updateThumbnail: (mapID, mapImageFile) => {
		let mapModel = null;
		let thumbnailImageModel = null;
		return Map.findById(mapID, {
			include: [{ model: MapImage, as: 'thumbnail' }],
		}).then(map => {
			if (map) {
				mapModel = map;
				if (map.thumbnail)
					return Promise.resolve(map.thumbnail);
				else
					return MapImage.create({ mapID: mapID });
			}
			return Promise.reject(new ServerError(404, 'Map not found'));
		}).then(thumbnailImage => {
			thumbnailImageModel = thumbnailImage;
			return storeMapImage(mapImageFile, thumbnailImage.id);
		}).then(results => {
			return sequelize.transaction(t => {
				return mapModel.update({ thumbnailID: thumbnailImageModel.id }, {
					transaction: t,
				}).then(() => {
					return thumbnailImageModel.update({
						small: results[0].downloadURL,
						medium: results[1].downloadURL,
						large: results[2].downloadURL,
					}, { transaction: t });
				})
			});
		});
	},

};
