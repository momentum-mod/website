import { Injectable, Logger, StreamableFile } from '@nestjs/common';
import { FileStoreCloudFile } from './file-store.interfaces';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { FileStoreUtils } from './file-store.utility';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FileStoreCloudService {
    s3Client: S3Client;

    private readonly logger = new Logger('File Store Cloud');

    constructor(private readonly config: ConfigService) {
        this.s3Client = new S3Client({
            region: this.config.get('storage.region'),
            endpoint: this.config.get('storage.endpointUrl'),
            credentials: {
                accessKeyId: this.config.get('storage.accessKeyID'),
                secretAccessKey: this.config.get('storage.secretAccessKey')
            },
            forcePathStyle: true
        });
    }

    async storeFileCloud(fileBuffer: Buffer, fileKey: string): Promise<FileStoreCloudFile> {
        await this.s3Client.send(
            new PutObjectCommand({
                Bucket: this.config.get('storage.bucketName'),
                Key: fileKey,
                Body: fileBuffer
            })
        );

        this.logger.log(`UPLOAD SUCCESS! Uploaded file ${fileKey} to bucket ${this.config.get('storage.bucketName')}`);

        return {
            fileKey: fileKey,
            hash: FileStoreUtils.getBufferHash(fileBuffer)
        };
    }

    async deleteFileCloud(fileKey: string): Promise<void> {
        await this.s3Client.send(
            new DeleteObjectCommand({
                Bucket: this.config.get('storage.bucketName'),
                Key: fileKey
            })
        );

        this.logger.log(`DELETE SUCCESS! Deleted file ${fileKey} from bucket ${this.config.get('storage.bucketName')}`);
    }

    async getFileCloud(fileKey: string): Promise<StreamableFile | undefined> {
        try {
            const cmdRes = await this.s3Client.send(
                new GetObjectCommand({
                    Bucket: this.config.get('storage.bucketName'),
                    Key: fileKey
                })
            );

            return new StreamableFile(await cmdRes.Body.transformToByteArray());
        } catch (error) {
            // If file isn't found, just return undefined and let the service handle 404 behaviour.
            if (error?.Code === 'NoSuchKey') return;
            throw error;
        }
    }
}
