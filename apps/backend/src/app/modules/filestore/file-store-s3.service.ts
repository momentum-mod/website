import { Injectable } from '@nestjs/common';
import { FileStoreFile } from './file-store.interface';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectsCommand
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { FileStoreService } from './file-store.service';

@Injectable()
export class FileStoreS3Service extends FileStoreService {
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    super();

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

  async storeFile(fileBuffer: Buffer, fileKey: string): Promise<FileStoreFile> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
        Body: fileBuffer
      })
    );

    return {
      fileKey,
      hash: FileStoreService.getHashForBuffer(fileBuffer)
    };
  }

  async copyFile(fromKey: string, toKey: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new CopyObjectCommand({
          Bucket: this.bucket,
          CopySource: `${this.bucket}/${fromKey}`,
          Key: toKey
        })
      );
      return true;
    } catch (error) {
      // If file isn't found, just return undefined and let the service handle
      // 404 behaviour.
      if (error?.Code === 'NoSuchKey') return false;
      throw error;
    }
  }

  async deleteFile(fileKey: string): Promise<boolean> {
    return this.isMissingHandler(
      this.s3Client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: fileKey })
      )
    );
  }

  async deleteFiles(fileKeys: string[]): Promise<boolean> {
    return this.isMissingHandler(
      this.s3Client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: fileKeys.map((Key) => ({ Key })) }
        })
      )
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
      // If file isn't found, just return null and let the service handle
      // 404 behaviour.
      if (error?.Code === 'NoSuchKey') return null;
      throw error;
    }
  }

  private async isMissingHandler(
    commandOutput: Promise<unknown>
  ): Promise<boolean> {
    try {
      await commandOutput;
      return true;
    } catch (error) {
      // If file isn't found, just return false and let the service handle
      // 404 behaviour.
      if (error?.Code === 'NoSuchKey') return false;
      throw error;
    }
  }
}
