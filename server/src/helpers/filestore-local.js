'use strict';

const config = require('../../config/config'),
	 fs = require('fs'),
	 fsutil = require('./filestore-utils');

module.exports = {
	// fileName is most likely 'maps/mapID'
	storeMapFileLocal: async (mapFileBuffer, fileName) => {
		const basePath = __dirname + '/../../public/';
		const fullPath = basePath + fileName;
		const downloadURL = `${config.baseURL_API}/api/${fileName}/download`;

		const hash = fsutil.getBufferHash(mapFileBuffer);
		return new Promise((res, rej) => {
			fs.writeFile(fullPath, mapFileBuffer, (err) => {
				if (err) {
					rej(err);
				}
				else {
					res({
						fileName: fileName,
						basePath: basePath,
						fullPath: fullPath,
						downloadURL: downloadURL,
						hash: hash,
					});
				}
			});
		});
	},

	// fileName is most likely 'img/imgID-<size>.jpg'
	storeImageFileLocal: async ( imageFileBuffer, fileName ) => {
		const basePath = __dirname + '/../../public/';
		const fullPath = basePath + fileName;
		const downloadURL = config.baseURL + '/' + fileName;

		return new Promise((res, rej) => { 
			fs.writeFile(fullPath, imageFileBuffer, (err) => {
				if (err) {
					rej(err);
				}
				else {
					res({
						fileName: fileName,
						basePath: basePath,
						fullPath: fullPath,
						downloadURL: downloadURL,
					});
				}
			});
		});
	},

	// fileName is most likely 'runs/runID'
	storeRunFileLocal: async ( resultObj, fileName ) => {
		const basePath = __dirname + '/../../public/';
		const fullPath = basePath + fileName;
		const downloadURL = `${config.baseURL_API}/api/maps/${resultObj.map.id}/${fileName}/download`;

		return new Promise((res, rej) => { 
			fs.writeFile(fullPath, resultObj.bin.buf, (err) => {
				if (err) {
					rej(err);
				}
				else {
					res({
						fileName: fileName,
						basePath: basePath,
						fullPath: fullPath,
						downloadURL: downloadURL,
					});
				}
			});
		});
	},

	deleteLocalFile: async (fileLocation) => {
		return new Promise((resolve, reject) => {
			fs.stat(fileLocation, err => {
				if (err) {
					if (err.code === 'ENOENT')
						return resolve();
					else
						return reject(err);
				}
				fs.unlink(fileLocation, err => {
					if (err)
						return reject(err);
					resolve();
				});
			});
		});
	},
}