'use strict';

const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3'),
	config = require('../../config/config'),
	fsutil = require('./filestore-utils');

const s3Client = new S3Client({
	region: config.storage.region,
	endpoint: config.storage.endpointURL,
	forcePathStyle: true,
	signatureVersion: 'v4',
});

module.exports = {

	storeFileCloud: async (fileBuffer, fileKey) => {
		const results = await s3Client.send( new PutObjectCommand( {
			Bucket: config.storage.bucketName,
			Key: fileKey,
			Body: fileBuffer,
		} ) );

		console.log(`UPLOAD SUCCESS! Uploaded file ${fileKey} to bucket ${config.storage.bucketName}`);
		const downloadURL = `${config.baseURL_CDN}/${config.storage.bucketName}/${fileKey}`;
		console.log(`File should be accessible at ${downloadURL}`);
		console.log(results);

		const hash = fsutil.getBufferHash(fileBuffer);
		return {
			fileName: fileKey,
			downloadURL: downloadURL,
			hash: hash,
		}
	},

	deleteFileCloud: async (fileKey) => {
		const results = await s3Client.send( new DeleteObjectCommand( {
			Bucket: config.storage.bucketName,
			Key: fileKey
		} ) );

		console.log(`DELETE SUCCESS! Deleted file ${fileKey} from bucket ${config.storage.bucketName}`);
		console.log(results);
	},
}