import { Injectable, Logger } from '@nestjs/common';
import { appConfig } from 'config/config';
import { FileStoreUtilsService } from './utils.service';
import { IFileStoreCloudFile } from './fileStore.interface';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

let s3Client: S3Client;

@Injectable()
export class FileStoreCloudService {
    constructor(private fsUtil: FileStoreUtilsService) {
        s3Client = new S3Client({
            region: appConfig.storage.region,
            endpoint: appConfig.storage.endpointURL,
            credentials: {
                accessKeyId: appConfig.storage.accessKeyID,
                secretAccessKey: appConfig.storage.secretAccessKey
            }
        });
    }

    public async storeFileCloud(fileBuffer: Buffer, fileKey: string): Promise<IFileStoreCloudFile> {
        const results = await s3Client.send(
            new PutObjectCommand({
                Bucket: appConfig.storage.bucketName,
                Key: fileKey,
                Body: fileBuffer
            })
        );

        Logger.debug(`UPLOAD SUCCESS! Uploaded file ${fileKey} to bucket ${appConfig.storage.bucketName}`);
        const downloadURL = `${appConfig.baseURL_CDN}/${appConfig.storage.bucketName}/${fileKey}`;
        Logger.debug(`File should be accessible at ${downloadURL}`);
        Logger.debug(results);

        const hash = this.fsUtil.getBufferHash(fileBuffer);
        return {
            fileName: fileKey,
            downloadURL: downloadURL,
            hash: hash
        };
    }

    public async deleteFileCloud(fileKey: string): Promise<void> {
        const results = await s3Client.send(
            new DeleteObjectCommand({
                Bucket: appConfig.storage.bucketName,
                Key: fileKey
            })
        );

        Logger.debug(`DELETE SUCCESS! Deleted file ${fileKey} from bucket ${appConfig.storage.bucketName}`);
        Logger.debug(results);
    }
}
