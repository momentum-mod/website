import { Injectable, Logger } from '@nestjs/common';
import { appConfig } from '../../../config/config';
import { IFileStoreCloudFile } from './file-store.interface';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { FileStoreUtils } from './file-store.utility';
@Injectable()
export class FileStoreCloudService {
    s3Client: S3Client;

    constructor() {
        this.s3Client = new S3Client({
            region: appConfig.storage.region,
            endpoint: appConfig.storage.endpointURL,
            credentials: {
                accessKeyId: appConfig.storage.accessKeyID,
                secretAccessKey: appConfig.storage.secretAccessKey
            }
        });
    }

    async storeFileCloud(fileBuffer: Buffer, fileKey: string): Promise<IFileStoreCloudFile> {
        await this.s3Client.send(
            new PutObjectCommand({
                Bucket: appConfig.storage.bucketName,
                Key: fileKey,
                Body: fileBuffer
            })
        );

        Logger.log(`UPLOAD SUCCESS! Uploaded file ${fileKey} to bucket ${appConfig.storage.bucketName}`);

        return {
            fileKey: fileKey,
            hash: FileStoreUtils.getBufferHash(fileBuffer)
        };
    }

    async deleteFileCloud(fileKey: string): Promise<void> {
        await this.s3Client.send(
            new DeleteObjectCommand({
                Bucket: appConfig.storage.bucketName,
                Key: fileKey
            })
        );

        Logger.log(`DELETE SUCCESS! Deleted file ${fileKey} from bucket ${appConfig.storage.bucketName}`);
    }
}
