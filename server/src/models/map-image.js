'use strict';
const imageEditor = require('sharp'),
	config = require('../../config/config'),
	ServerError = require('../helpers/server-error'),
	{ sequelize, Map, MapImage } = require('../../config/sqlize'),
	store_local = require('../helpers/filestore-local'),
	store_cloud = require('../helpers/filestore-cloud');

const editAndSaveMapImageFile = (imageFileBuffer, fileName, width, height) => {
	return imageEditor(imageFileBuffer)
	.resize(width, height, { fit: 'inside' })
	.jpeg({ mozjpeg: true })
	.toBuffer()
	.then((data) => {
		if ( config.storage.useLocal )
		{
			return store_local.storeImageFileLocal(data, fileName);
		}

		return store_cloud.storeFileCloud(data, fileName);
	}).catch(err => {
		err.status = 400;
		return Promise.reject(err);
	});
};

const storeMapImage = (imageFileBuffer, imgID) => {
	return Promise.all([
		editAndSaveMapImageFile(imageFileBuffer, `img/${imgID}-small.jpg`, 480, 360),
		editAndSaveMapImageFile(imageFileBuffer, `img/${imgID}-medium.jpg`, 1280, 720),
		editAndSaveMapImageFile(imageFileBuffer, `img/${imgID}-large.jpg`, 1920, 1080)
	]);
};

const deleteMapImageFile = (imgFileName) => {

	if ( config.storage.useLocal )
	{
		const imgFileLocation = __dirname + '/../../public/' + imgFileName;
		return store_local.deleteLocalFile(imgFileLocation);
	}

	return store_cloud.deleteFileCloud(imgFileName);
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
		return Map.findByPk(mapID, {
			raw: true
		}).then(map => {
			if (map) {
				mapModel = map;
				return MapImage.count({ where: { mapID: mapID }});
			}
			return Promise.reject(new ServerError(404, 'Map not found'));
		}).then(imageCount => {
			if (mapModel.thumbnailID)
				imageCount--; // Exclude the thumbnail
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
		return MapImage.findByPk(imgID, {
			raw: true,
		});
	},

	update: (imgID) => {
		return MapImage.findByPk(imgID, {
			raw: true
		}).then(mapImage => {
			if (mapImage) {
				delete mapImage.id;
				return MapImage.destroy({
					where: { id: imgID },
				}).then(() => {
					return MapImage.create(mapImage);
				});
			} else {
				return Promise.reject(new ServerError(404, 'Map image not found'));
			}
		});
	},

	deleteMapImageFiles: (imgID) => {
		return Promise.all([
			deleteMapImageFile(`img/${imgID}-small.jpg`),
			deleteMapImageFile(`img/${imgID}-medium.jpg`),
			deleteMapImageFile(`img/${imgID}-large.jpg`)
		]);
	},

	delete: (imgID) => {
		return MapImage.findByPk(imgID).then(mapImage => {
			if (mapImage) {
				let tempList = mapImage.small.split("/");
				let lastElement = tempList[tempList.length -1];
				let imgFileId = lastElement.replace(/\D/g, "");
				return module.exports.deleteMapImageFiles(imgFileId).then(() => {
					return MapImage.destroy({
						where: { id: imgID },
					});
				});
			} else {
				return Promise.reject(new ServerError(404, 'Map image not found'));
			}
		});
	},

	updateThumbnail: (mapID, mapImageFile) => {
		let mapModel = null;
		let thumbnailImageModel = null;
		return Map.findByPk(mapID, {
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
