import { Injectable } from '@nestjs/common';
import { FileStoreCloudFile } from './file-store.interface';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';

@Injectable()
export class FileStoreCloudService {
  s3Client: S3Client;
  bucket: string;

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

    this.bucket = this.config.get('storage.bucketName');
  }

  async storeFileCloud(
    fileBuffer: Buffer,
    fileKey: string
  ): Promise<FileStoreCloudFile> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
        Body: fileBuffer
      })
    );

    return {
      fileKey,
      hash: FileStoreCloudService.getHashForBuffer(fileBuffer)
    };
  }

  async deleteFileCloud(fileKey: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fileKey
      })
  /**
   * Delete a file from cloud storage.
   *
   * @returns `true` if file was found and deleted, `false` if file was missing.
   * @throws S3ServiceException
   */
    );
  }

  async getFile(fileKey: string): Promise<Uint8Array | null> {
    try {
      const commandResponse = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: fileKey
        })
      );

      return commandResponse.Body.transformToByteArray();
    } catch (error) {
      // If file isn't found, just return undefined and let the service handle
      // 404 behaviour.
      if (error?.Code === 'NoSuchKey') return;
      throw error;
    }
  }

  static getHashForBuffer(buffer: Buffer): string {
    return createHash('sha1').update(buffer).digest('hex');
  }
}
