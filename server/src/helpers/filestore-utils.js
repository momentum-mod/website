'use strict';

const crypto = require('crypto'),
	fs = require('fs');

module.exports = {
	getFileHash: (filePath) => {
		return new Promise((resolve, reject) => {
			const hash = crypto.createHash('sha1').setEncoding('hex');
			fs.createReadStream(filePath).pipe(hash)
				.on('error', err => reject(err))
				.on('finish', () => {
					resolve(hash.read())
				});
		});
	},

	getBufferHash: (buf) => {
		const hash = crypto.createHash('sha1');
		hash.update(buf);
		return hash.digest('hex');
	}
}