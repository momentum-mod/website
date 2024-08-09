import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { FileStoreFile } from './file-store.interface';
import { FileStoreService } from './file-store.service';

@Injectable()
export class FileStoreS3Service extends FileStoreService {
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    super();

    this.s3Client = new S3Client({
      region: this.config.getOrThrow('storage.region'),
      endpoint: this.config.getOrThrow('storage.endpointUrl'),
      credentials: {
        accessKeyId: this.config.getOrThrow('storage.accessKeyID'),
        secretAccessKey: this.config.getOrThrow('storage.secretAccessKey')
      },
      forcePathStyle: true
    });

    this.bucket = this.config.getOrThrow('storage.bucketName');
  }

  async storeFile(
    fileBuffer: Buffer,
    fileKey: string,
    contentType?: string
  ): Promise<FileStoreFile> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: contentType
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
    // AWS S3 docs limit this command to 1000 keys, assuming other S3 providers
    // do the same.
    // https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObjects.html
    for (let i = 0; i < fileKeys.length; i += 1000) {
      const ok = await this.isMissingHandler(
        this.s3Client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: {
              Objects: fileKeys.slice(i, i + 1000).map((Key) => ({ Key }))
            }
          })
        )
      );

      if (!ok) return false;
    }

    return true;
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

  async listFileKeys(prefix: string): Promise<string[]> {
    const response = await this.s3Client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Delimiter: '/',
        Prefix: prefix
      })
    );

    if (response.KeyCount === 0 || !response.Contents) return [];
    return response.Contents.map(({ Key }) => Key);
  }

  async getPreSignedUrl(
    fileKey: string,
    fileSize: number,
    urlExpires: number
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentLength: fileSize
    });

    return await getSignedUrl(this.s3Client, command, {
      expiresIn: urlExpires
    });
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
